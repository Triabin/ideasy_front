import UnicodeEsc from '@/components/icons/UnicodeEsc.vue';

export default {
  title: 'Unicode转义',
  menuOrder: 25,
  hidden: false,
  icon: UnicodeEsc,
  tags: ['Unicode', '转义', '反转义', 'escape', '中文转码', '字符串', '编码', '解码', 'u码'],
  desc: 'Unicode 转义与反转义工具。可将中文、emoji 等非 ASCII 字符转为 \\uXXXX、\\u{XXXXX}、\\xXX、HTML 实体（&#x…; 与 &#…;）或 %uXXXX 格式的纯 ASCII 转义串，也可将转义文本一键还原为可读文字；反转义自动识别全部格式混合使用，并正确合并 emoji 代理对。'
}
