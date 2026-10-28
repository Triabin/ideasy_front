import { onMounted, onBeforeUnmount, useTemplateRef, ref } from 'vue';

/** 拖拽进入/悬停于 #app 区域时，挂载在 html 上的标记类名（可用于全局样式反馈） */
const DRAGGING_CLASS = 'is-dragging-file';
/** 全屏拖拽遮罩层的类名（样式见同名注入的 <style>） */
const OVERLAY_CLASS = 'fsd-overlay';
/** 遮罩层内提示文案元素的类名 */
const OVERLAY_TEXT_CLASS = 'fsd-overlay-text';

/** 文件类型校验器：传入 File，返回是否允许上传 */
export type FileAcceptValidator = (file: File) => boolean;

export interface UseFullScreenDropFileOptions {
  /**
   * 允许上传的文件类型，默认不限制。支持三种写法（可混用数组）：
   * - 扩展名：'.png' / '*.png'
   * - MIME 类型：'image/*' / 'application/pdf'（MIME 主类型通配）
   * - 自定义函数：(file: File) => boolean
   */
  accept?: string | string[] | FileAcceptValidator;
  /** 单个文件最大体积（字节），默认不限制 */
  maxSize?: number;
  /** 一次拖拽允许的最大文件数量，默认不限制 */
  maxCount?: number;
  /** 文件因类型/大小/数量被过滤或拦截时的回调 */
  onReject?: (rejected: File[], reason: 'type' | 'size' | 'count', accepted: File[]) => void;
  /** 全部通过校验、注入 input 之前的回调（可拿到最终文件列表） */
  onDrop?: (files: File[]) => void;
  /** 拖拽悬浮时遮罩层展示的提示文案 */
  overlayText?: string;
  /** 是否启用全屏拖拽遮罩效果，默认 true */
  showOverlay?: boolean;
}

/** 把 accept 配置统一编译成 File -> boolean 的校验函数 */
const compileAccept = (accept?: string | string[] | FileAcceptValidator): FileAcceptValidator => {
  if (typeof accept === 'function') return accept;
  if (!accept || (Array.isArray(accept) && !accept.length)) return () => true;

  const patterns = (Array.isArray(accept) ? accept : accept.split(','))
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  return (file: File) => {
    const name = file.name.toLowerCase();
    const type = (file.type || '').toLowerCase();
    return patterns.some((pattern) => {
      if (pattern.startsWith('.')) return name.endsWith(pattern); // 扩展名 .png
      if (pattern.startsWith('*.')) return name.endsWith(pattern.slice(1)); // *.png
      if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1)); // image/*
      if (pattern.includes('/')) return type === pattern; // application/pdf
      return name.endsWith(`.${pattern}`); // 裸写 png 视为扩展名
    });
  };
};

/**
 * 递归读取拖入的条目：文件夹会展开收集其中的文件，文件则直接收集
 * @param entry FileSystemEntry（文件或目录）
 * @param files 收集结果的引用数组
 */
const collectFilesFromEntry = async (entry: FileSystemEntry, files: File[]): Promise<void> => {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    files.push(file);
    return;
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries 单次最多返回一部分条目，需循环读取直到返回空数组
    for (;;) {
      const children = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      if (!children.length) break;
      for (const child of children) {
        await collectFilesFromEntry(child, files);
      }
    }
  }
};

/** 遮罩层样式只需注入一次 */
let overlayStyleInjected = false;
const injectOverlayStyle = () => {
  if (overlayStyleInjected || typeof document === 'undefined') return;
  overlayStyleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.${DRAGGING_CLASS} body { user-select: none; }
.${OVERLAY_CLASS} {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s ease;
}
.${OVERLAY_CLASS}.visible { opacity: 1; }
.${OVERLAY_CLASS} .fsd-inner {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 48px 72px; border-radius: 16px;
  border: 2px dashed rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.08);
  color: #fff; font-size: 18px; text-align: center;
}
.${OVERLAY_CLASS} .fsd-icon { width: 56px; height: 56px; opacity: 0.9; }
`;
  document.head.appendChild(style);
};

type FileInput = ReturnType<typeof useTemplateRef<HTMLInputElement>> | ReturnType<typeof ref<HTMLInputElement>>;
/**
 * 全屏拖拽文件上传
 * 将dragover/drop事件绑定在vue项目的div#app上，
 * 对拖入的多文件、单文件、文件夹等情况统一处理后注入上传input并触发change。
 * 拖拽悬浮时会显示带提示文案的全屏遮罩层；支持自定义可上传文件的类型/大小/数量限制（默认不限制）。
 * @param fileInput {FileInput} 文件上传对应的输入框元素对象
 * @param options {UseFullScreenDropFileOptions} 类型/大小/数量限制及回调等配置项
 * @param custom {boolean} 是否手动控制全屏监听事件，默认否（用于一些需要反复增删监听事件的页面）
 */
const useFullScreenDropFile = (
  fileInput: FileInput,
  options: UseFullScreenDropFileOptions = {},
  custom: boolean = false,
) => {
  const app = document.getElementById('app');
  if (!app || !fileInput) return {};

  const {
    accept,
    maxSize,
    maxCount,
    onReject,
    onDrop,
    overlayText = '松开鼠标，上传文件',
    showOverlay = true,
  } = options;

  const isTypeAllowed = compileAccept(accept);

  /** 遮罩层 DOM（懒创建，组件卸载时移除） */
  let overlay: HTMLElement | null = null;
  const getOverlay = (): HTMLElement | null => {
    if (!showOverlay) return null;
    if (!overlay) {
      injectOverlayStyle();
      overlay = document.createElement('div');
      overlay.className = OVERLAY_CLASS;
      overlay.innerHTML = `
        <div class="fsd-inner">
          <svg class="fsd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V4m0 0L7 9m5-5l5 5"/>
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
          </svg>
          <span class="${OVERLAY_TEXT_CLASS}"></span>
        </div>`;
      (overlay.querySelector(`.${OVERLAY_TEXT_CLASS}`) as HTMLElement).textContent = overlayText;
    }
    return overlay;
  };

  const showDragOverlay = () => {
    const el = getOverlay();
    if (!el) return;
    if (!el.isConnected) document.body.appendChild(el);
    // 下一帧再加 visible，保证 opacity 过渡生效
    requestAnimationFrame(() => el.classList.add('visible'));
  };

  const hideDragOverlay = () => overlay?.classList.remove('visible');

  /** 把收集到的文件通过 DataTransfer 注入 input 并触发 change 事件 */
  const injectFilesToInput = (files: File[]) => {
    const input = fileInput.value;
    if (!input || !files.length) return;

    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** 判断拖拽内容是否为文件（否则可能是拖选文字、链接等，不做处理） */
  const hasFiles = (e: DragEvent): boolean => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  };

  /** 防止浏览器默认行为（如直接打开文件），使 drop 事件可以正常触发 */
  const preventDefault = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    // 设置拖拽光标效果
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  /** 按类型 / 大小 / 数量对收集到的文件做过滤校验 */
  const validateFiles = (files: File[]): File[] => {
    const rejected: File[] = [];
    let passed = files.filter((file) => {
      if (!isTypeAllowed(file)) {
        rejected.push(file);
        return false;
      }
      if (typeof maxSize === 'number' && file.size > maxSize) {
        rejected.push(file);
        return false;
      }
      return true;
    });

    // 类型/大小被拒绝时优先上报
    if (rejected.length) {
      const overSized = passed.length === files.length ? [] : rejected.filter((f) => isTypeAllowed(f));
      onReject?.(rejected, overSized.length ? 'size' : 'type', passed);
    }

    if (typeof maxCount === 'number' && passed.length > maxCount) {
      const overflowed = passed.slice(maxCount);
      passed = passed.slice(0, maxCount);
      onReject?.(overflowed, 'count', passed);
    }

    return passed;
  };

  let dragDepth = 0; // 记录进入 #app 的层级深度，避免子元素间移动时遮罩反复闪烁

  const handleDragEnter = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth += 1;
    document.documentElement.classList.add(DRAGGING_CLASS);
    showDragOverlay();
  };
  const handleDragLeave = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      document.documentElement.classList.remove(DRAGGING_CLASS);
      hideDragOverlay();
    }
  };
  const handleDrop = async (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth = 0;
    document.documentElement.classList.remove(DRAGGING_CLASS);
    hideDragOverlay();

    const items = e.dataTransfer?.items;
    if (!items || !items.length) return;

    const files: File[] = [];
    try {
      // 优先使用 webkitGetAsEntry，可识别文件夹并递归展开
      const entries = Array.from(items)
        .map((item) => item.webkitGetAsEntry?.())
        .filter((entry): entry is FileSystemEntry => !!entry);

      if (entries.length) {
        for (const entry of entries) {
          await collectFilesFromEntry(entry, files);
        }
      } else {
        // 降级方案：不支持 entry API 时只按普通文件列表处理
        files.push(...Array.from(e.dataTransfer?.files ?? []));
      }
    } catch (err) {
      console.error('[useFullScreenDropFile] 解析拖拽文件失败:', err);
      // 最终兜底：直接使用 dataTransfer.files（不含文件夹内容）
      files.push(...Array.from(e.dataTransfer?.files ?? []));
    }

    const validFiles = validateFiles(files);
    if (!validFiles.length) return;

    onDrop?.(validFiles);
    injectFilesToInput(validFiles);
  };

  const addEvent = () => {
    app.addEventListener('dragenter', handleDragEnter);
    app.addEventListener('dragover', preventDefault);
    app.addEventListener('dragleave', handleDragLeave);
    app.addEventListener('drop', handleDrop);
  };
  const removeEvent = () => {
    app.removeEventListener('dragenter', handleDragEnter);
    app.removeEventListener('dragover', preventDefault);
    app.removeEventListener('dragleave', handleDragLeave);
    app.removeEventListener('drop', handleDrop);
    document.documentElement.classList.remove(DRAGGING_CLASS);
    overlay?.remove();
    overlay = null;
  };

  if (!custom) {
    onMounted(() => addEvent());
  }
  onBeforeUnmount(() => removeEvent());
  return { addEvent, removeEvent };
};

export default useFullScreenDropFile;
