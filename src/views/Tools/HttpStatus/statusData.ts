/**
 * HTTP 状态码速查数据
 * 涵盖 IANA「HTTP Status Codes」注册表中的全部标准状态码（RFC 9110/9111、RFC 6585、RFC 4918 等），
 * 并收录 nginx、Cloudflare、Laravel、Spring 等常见的非标准扩展码。
 */

/** 状态码分类（按百位数划分） */
export type CatKey = '1xx' | '2xx' | '3xx' | '4xx' | '5xx';

/** 状态码条目 */
export type StatusItem = {
  /** 状态码 */
  code: number;
  /** 英文名称（现行规范名） */
  en: string;
  /** 旧版规范英文名（若曾更名） */
  alt?: string;
  /** 中文名称 */
  zh: string;
  /** 含义与常见出现场景 */
  desc: string;
  /** 出处（规范编号或定义厂商） */
  src: string;
  /** 是否常见状态码 */
  common?: boolean;
  /** 是否 IANA 标准注册码；nginx/Cloudflare 等非标准扩展码为 false */
  std?: boolean;
  /** 补充标签（WebDAV、愚人节玩笑、保留、已废弃等） */
  tag?: string;
};

/** 分类元信息（类名必须写全，否则构建时不会被打进样式包） */
export const CATS: {
  key: CatKey;
  /** 中文名 */
  zh: string;
  /** 英文名 */
  en: string;
  /** 分类含义概述 */
  summary: string;
  /** 状态码徽章类名 */
  badge: string;
  /** 分类卡片选中时的边框类名 */
  activeBorder: string;
}[] = [
  {
    key: '1xx', zh: '信息响应', en: 'Informational',
    summary: '请求已被接收，服务器正在继续处理。浏览器一般会自动处理，用户无感知。',
    badge: 'badge-info', activeBorder: 'border-info',
  },
  {
    key: '2xx', zh: '成功', en: 'Success',
    summary: '请求已被成功接收、理解并接受，服务器返回了预期的结果。',
    badge: 'badge-success', activeBorder: 'border-success',
  },
  {
    key: '3xx', zh: '重定向', en: 'Redirection',
    summary: '需要客户端采取进一步操作（通常是访问新地址）才能完成请求，浏览器一般会自动跟随。',
    badge: 'badge-primary', activeBorder: 'border-primary',
  },
  {
    key: '4xx', zh: '客户端错误', en: 'Client Error',
    summary: '请求本身有问题（语法、认证、权限、参数等），服务器无法或拒绝处理。',
    badge: 'badge-warning', activeBorder: 'border-warning',
  },
  {
    key: '5xx', zh: '服务器错误', en: 'Server Error',
    summary: '请求本身合法，但服务器在处理时出错。问题出在服务端，重试未必有效。',
    badge: 'badge-error', activeBorder: 'border-error',
  },
];

/** 全量状态码列表 */
export const ITEMS: StatusItem[] = [
  // ─────────────── 1xx 信息响应 ───────────────
  {
    code: 100, en: 'Continue', zh: '继续', common: true, src: 'RFC 9110',
    desc: '服务器已收到请求头且同意接收请求体，客户端应继续发送剩余内容。配合「Expect: 100-continue」请求头使用，可避免大文件上传被拒后浪费带宽。',
  },
  {
    code: 101, en: 'Switching Protocols', zh: '切换协议', common: true, src: 'RFC 9110',
    desc: '服务器已理解并同意客户端的 Upgrade 请求头，将切换到其他协议继续通信。WebSocket 握手成功、升级到 HTTP/2 时都会返回该状态码。',
  },
  {
    code: 102, en: 'Processing', zh: '处理中', src: 'RFC 4918', tag: 'WebDAV',
    desc: 'WebDAV 扩展：服务器已收到并正在处理请求，但暂无可用响应，用于防止长时间操作导致客户端超时。',
  },
  {
    code: 103, en: 'Early Hints', zh: '早期提示', src: 'RFC 8297',
    desc: '在最终响应之前先行发送的临时响应，携带 Link 头让浏览器在服务器生成完整响应期间提前预加载关键资源，加快首屏渲染。',
  },

  // ─────────────── 2xx 成功 ───────────────
  {
    code: 200, en: 'OK', zh: '成功', common: true, src: 'RFC 9110',
    desc: '请求成功。具体含义随请求方法而异：GET 返回资源内容，POST 返回处理结果，PUT/DELETE 返回操作状态说明。',
  },
  {
    code: 201, en: 'Created', zh: '已创建', common: true, src: 'RFC 9110',
    desc: '请求成功并创建了新资源，常见于 POST/PUT 提交。响应头 Location 通常携带新资源的 URI。',
  },
  {
    code: 202, en: 'Accepted', zh: '已接受', common: true, src: 'RFC 9110',
    desc: '请求已被接受进入处理队列，但尚未处理完成，最终成功与否未知。常用于异步任务：批量导入、视频转码等后台作业。',
  },
  {
    code: 203, en: 'Non-Authoritative Information', zh: '非授权信息', src: 'RFC 9110',
    desc: '请求已成功，但返回的元信息来自代理服务器的缓存副本，可能与源服务器的原始数据不一致。',
  },
  {
    code: 204, en: 'No Content', zh: '无内容', common: true, src: 'RFC 9110',
    desc: '请求成功但没有响应体，浏览器不应离开当前页面。常用于表单异步提交、埋点上报、DELETE 删除等无需返回数据的场景。',
  },
  {
    code: 205, en: 'Reset Content', zh: '重置内容', src: 'RFC 9110',
    desc: '请求成功，服务器要求客户端重置文档视图，例如清空表单内容、恢复画布默认状态，以便用户开始下一次输入。',
  },
  {
    code: 206, en: 'Partial Content', zh: '部分内容', common: true, src: 'RFC 9110',
    desc: '服务器成功返回了 Range 请求头指定范围的部分内容。用于断点续传、音视频流分段加载，配合 Content-Range 头说明实际范围。',
  },
  {
    code: 207, en: 'Multi-Status', zh: '多状态', src: 'RFC 4918', tag: 'WebDAV',
    desc: 'WebDAV 扩展：一次请求涉及多个子操作，响应体为 XML 格式，分别描述每个子操作的状态。',
  },
  {
    code: 208, en: 'Already Reported', zh: '已报告', src: 'RFC 5842', tag: 'WebDAV',
    desc: 'WebDAV 扩展：在 207 多状态响应中，表示某个集合成员的状态已在前面的应答中报告过，避免重复枚举。',
  },
  {
    code: 226, en: 'IM Used', zh: '已应用实例控制', src: 'RFC 3229',
    desc: '服务器已对资源执行了一个或多个实例操控（Instance-Manipulation），响应体中包含操控后的结果，配合 Delta 编码等机制使用。',
  },

  // ─────────────── 3xx 重定向 ───────────────
  {
    code: 300, en: 'Multiple Choices', zh: '多种选择', src: 'RFC 9110',
    desc: '同一资源存在多个可用版本（不同格式、语言或镜像地址），服务器返回候选列表，由客户端自行选择其一。',
  },
  {
    code: 301, en: 'Moved Permanently', zh: '永久重定向', common: true, src: 'RFC 9110',
    desc: '资源已永久迁移到 Location 头指定的新地址。搜索引擎会更新索引，浏览器会缓存该跳转；后续请求应直接使用新地址。',
  },
  {
    code: 302, en: 'Found', alt: 'Moved Temporarily', zh: '临时重定向', common: true, src: 'RFC 9110',
    desc: '资源暂时位于其他地址，客户端应继续使用原 URI 发起后续请求。历史上多数浏览器会将 POST 改为 GET 重定向，需要保持方法时应使用 307。',
  },
  {
    code: 303, en: 'See Other', zh: '查看其他资源', src: 'RFC 9110',
    desc: '请求的处理结果位于另一个 URI，客户端必须改用 GET 方法获取。「POST 提交后跳转到结果页」（POST-Redirect-GET 模式）的标准实现方式。',
  },
  {
    code: 304, en: 'Not Modified', zh: '未修改', common: true, src: 'RFC 9110',
    desc: '协商缓存命中：资源自上次请求后未发生变化（If-Modified-Since / If-None-Match 校验通过），不返回响应体，客户端直接使用本地缓存。',
  },
  {
    code: 305, en: 'Use Proxy', zh: '使用代理', src: 'RFC 9110', tag: '已废弃',
    desc: '要求通过 Location 头指定的代理访问资源。因存在安全隐患已废弃，主流浏览器不予支持。',
  },
  {
    code: 306, en: 'Unused (Reserved)', zh: '未使用（保留）', src: 'RFC 9110', tag: '保留',
    desc: '早期规范中定义为「Switch Proxy」（后续请求改用指定代理），因安全问题废弃。目前该状态码保留未用。',
  },
  {
    code: 307, en: 'Temporary Redirect', zh: '临时重定向（保持方法）', common: true, src: 'RFC 9110',
    desc: '与 302 语义相同，但严格要求客户端重发请求时不得改变请求方法和请求体：POST 仍以 POST 重定向。',
  },
  {
    code: 308, en: 'Permanent Redirect', zh: '永久重定向（保持方法）', common: true, src: 'RFC 9110',
    desc: '与 301 语义相同，但严格要求不得改变请求方法。HTTP/HTTPS 整站升级跳转常用 301/308。',
  },

  // ─────────────── 4xx 客户端错误 ───────────────
  {
    code: 400, en: 'Bad Request', zh: '错误请求', common: true, src: 'RFC 9110',
    desc: '请求存在语法错误、参数非法或报文格式损坏，服务器无法理解。前端常见诱因：JSON 序列化错误、缺少必填参数、Content-Type 与请求体不匹配。',
  },
  {
    code: 401, en: 'Unauthorized', zh: '未认证（未授权）', common: true, src: 'RFC 9110',
    desc: '请求缺少有效的身份凭证，或凭证已过期失效。响应必须携带 WWW-Authenticate 头说明认证方式。语义是「你没登录」，与 403「登录了但没权限」相区分。',
  },
  {
    code: 402, en: 'Payment Required', zh: '需要付费', src: 'RFC 9110', tag: '保留',
    desc: '为数字支付场景预留的状态码，尚未标准化。个别平台用它表示配额耗尽、订阅到期等需要付费解锁的情况。',
  },
  {
    code: 403, en: 'Forbidden', zh: '禁止访问', common: true, src: 'RFC 9110',
    desc: '服务器理解了请求但拒绝执行：身份已确认却权限不足，或被 IP 黑名单、防盗链策略拦截。与 401 不同，重新认证也无济于事。',
  },
  {
    code: 404, en: 'Not Found', zh: '未找到', common: true, src: 'RFC 9110',
    desc: '服务器找不到请求 URI 对应的资源。地址拼写错误、资源已删除、前端路由未配置都会返回它；服务器不愿透露资源存在时也可能用 404 代替 403。',
  },
  {
    code: 405, en: 'Method Not Allowed', zh: '方法不允许', common: true, src: 'RFC 9110',
    desc: '资源存在，但不支持该请求方法（如对只读接口发起 DELETE、向仅收 GET 的地址发 POST）。响应必须携带 Allow 头列出支持的方法。',
  },
  {
    code: 406, en: 'Not Acceptable', zh: '不可接受', src: 'RFC 9110',
    desc: '服务器无法提供符合客户端 Accept / Accept-Language / Accept-Encoding 协商条件的内容版本，例如接口只产 JSON 而客户端只要 XML。',
  },
  {
    code: 407, en: 'Proxy Authentication Required', zh: '需要代理认证', src: 'RFC 9110',
    desc: '与 401 类似，但要求客户端先在代理服务器上完成身份认证。响应携带 Proxy-Authenticate 头说明代理的认证方式。',
  },
  {
    code: 408, en: 'Request Timeout', zh: '请求超时', common: true, src: 'RFC 9110',
    desc: '服务器在允许的等待时间内没有收到完整请求（客户端网络太慢或长时间未发送数据），连接被关闭。客户端可随时重试。',
  },
  {
    code: 409, en: 'Conflict', zh: '冲突', common: true, src: 'RFC 9110',
    desc: '请求与资源的当前状态冲突，无法完成。典型场景：重复创建同名资源、并发编辑导致版本冲突、删除仍有下级数据的记录。',
  },
  {
    code: 410, en: 'Gone', zh: '已永久删除', src: 'RFC 9110',
    desc: '资源曾经存在但已被永久删除，且没有可用的转发地址。与 404 的区别是明确表达「不会再回来」，搜索引擎会更快移除收录。',
  },
  {
    code: 411, en: 'Length Required', zh: '需要内容长度', src: 'RFC 9110',
    desc: '服务器拒绝处理没有 Content-Length 头的请求。旧式接口或严格的服务端框架可能要求明确声明请求体长度。',
  },
  {
    code: 412, en: 'Precondition Failed', zh: '前置条件失败', src: 'RFC 9110',
    desc: '条件请求头（If-Match / If-Unmodified-Since 等）的判定结果为假，操作被拒绝。常见于乐观锁更新：资源已被他人修改，ETag 不匹配。',
  },
  {
    code: 413, en: 'Content Too Large', alt: 'Payload Too Large', zh: '请求体过大', common: true, src: 'RFC 9110',
    desc: '请求体超过服务器愿意处理的上限。上传大文件、提交超长 JSON 时常见，需调大服务端限制（如 nginx 的 client_max_body_size）或分片上传。',
  },
  {
    code: 414, en: 'URI Too Long', alt: 'Request-URI Too Long', zh: '请求地址过长', src: 'RFC 9110',
    desc: '请求 URI 超过服务器能处理的长度。多因误用 GET 携带大量查询参数，或重定向循环导致 URL 不断变长。',
  },
  {
    code: 415, en: 'Unsupported Media Type', zh: '不支持的媒体类型', common: true, src: 'RFC 9110',
    desc: '请求体的格式（Content-Type）不被服务器支持。典型场景：接口只接受 application/json，却收到了 FormData 或纯文本。',
  },
  {
    code: 416, en: 'Range Not Satisfiable', alt: 'Requested Range Not Satisfiable', zh: '请求范围不满足', src: 'RFC 9110',
    desc: 'Range 头请求的字节区间超出资源实际大小（如对 500 字节的文件请求 bytes=1000-）。断点续传时本地记录的文件大小已失效也会触发。',
  },
  {
    code: 417, en: 'Expectation Failed', zh: '期望失败', src: 'RFC 9110',
    desc: '服务器无法满足 Expect 请求头声明的期望行为，最常见的是不支持「Expect: 100-continue」，直接返回此码拒绝接收请求体。',
  },
  {
    code: 418, en: "I'm a Teapot", zh: '我是茶壶', src: 'RFC 2324', tag: '愚人节玩笑',
    desc: '1998 年愚人节规范「超文本咖啡壶控制协议」（HTCPCP）定义的玩笑状态码：我是茶壶，不会煮咖啡。不少框架和网站保留了这个彩蛋。',
  },
  {
    code: 419, en: 'Page Expired', zh: '页面已过期', src: 'Laravel', std: false, tag: 'Laravel',
    desc: 'Laravel 框架的非标准状态码：CSRF Token 缺失或已过期（页面停留太久后提交表单）。刷新页面重新获取令牌即可。',
  },
  {
    code: 420, en: 'Method Failure', zh: '方法调用失败', src: 'Spring', std: false, tag: 'Spring',
    desc: 'Spring Framework 早期版本的非标准状态码，表示方法执行失败；官方已不建议使用，应改用 4xx/5xx 标准码。（Twitter 曾用 420 表示限流「Enhance Your Calm」。）',
  },
  {
    code: 421, en: 'Misdirected Request', zh: '错误定向的请求', src: 'RFC 9110',
    desc: '请求被发往了无法为该 URI 生成响应的服务器，常见于 HTTP/2 连接复用时命中了错误的虚拟主机。客户端可换一条连接重试。',
  },
  {
    code: 422, en: 'Unprocessable Content', alt: 'Unprocessable Entity', zh: '无法处理的实体', common: true, src: 'RFC 9110',
    desc: '请求格式正确（JSON 能解析），但内容存在语义错误，如字段校验失败、业务规则不满足。源自 WebDAV，现被大量 REST API 用于参数校验错误。',
  },
  {
    code: 423, en: 'Locked', zh: '已锁定', src: 'RFC 4918', tag: 'WebDAV',
    desc: 'WebDAV 扩展：资源已被锁定（如正在被其他用户编辑），当前操作无法执行。',
  },
  {
    code: 424, en: 'Failed Dependency', zh: '依赖失败', src: 'RFC 4918', tag: 'WebDAV',
    desc: 'WebDAV 扩展：当前操作依赖的前置操作失败了（如 PROPPATCH 中某条指令出错），本次操作随之未执行。',
  },
  {
    code: 425, en: 'Too Early', zh: '过早', src: 'RFC 8470',
    desc: '服务器不愿意冒险处理通过 TLS 1.3 0-RTT「早期数据」送达的请求，因为这类数据可能被重放攻击。客户端应改用普通连接重发。',
  },
  {
    code: 426, en: 'Upgrade Required', zh: '需要升级协议', src: 'RFC 9110',
    desc: '服务器拒绝以当前协议处理请求，要求客户端升级协议后重试。响应携带 Upgrade 头指明目标协议（如 HTTP/3.0、TLS/1.2）。',
  },
  {
    code: 428, en: 'Precondition Required', zh: '要求前置条件', src: 'RFC 6585',
    desc: '服务器要求请求必须携带条件头（如 If-Match）才肯执行，用于防止「丢失更新」：多人并发编辑时，未基于最新版本提交的修改会被拒绝。',
  },
  {
    code: 429, en: 'Too Many Requests', zh: '请求过多', common: true, src: 'RFC 6585',
    desc: '客户端在给定时间内发送了过多请求，触发限流。响应常携带 Retry-After 头告知何时可重试；接口调用超配额、爬虫被拦截时最常见。',
  },
  {
    code: 431, en: 'Request Header Fields Too Large', zh: '请求头过大', src: 'RFC 6585',
    desc: '请求头总大小或单个头字段超过服务器限制，最常见的诱因是 Cookie 累积过多过大。清理域名下的 Cookie 或调大服务端 header 限制可解决。',
  },
  {
    code: 444, en: 'No Response', zh: '无响应', src: 'nginx', std: false, tag: 'nginx',
    desc: 'nginx 特有状态码：不返回任何响应内容，直接关闭连接。常用于对付恶意扫描器、非法域名访问和无效请求，让攻击者得不到任何信息。',
  },
  {
    code: 451, en: 'Unavailable For Legal Reasons', zh: '因法律原因不可用', src: 'RFC 7725',
    desc: '资源因法律要求被屏蔽，如政府审查、法院禁令、版权下架。数字 451 致敬反乌托邦小说《华氏 451 度》。',
  },
  {
    code: 499, en: 'Client Closed Request', zh: '客户端关闭请求', common: true, src: 'nginx', std: false, tag: 'nginx',
    desc: 'nginx 特有状态码：服务器尚未返回响应，客户端就主动断开了连接。日志中大量 499 通常说明后端处理太慢，用户等不及刷新或关掉了页面。',
  },

  // ─────────────── 5xx 服务器错误 ───────────────
  {
    code: 500, en: 'Internal Server Error', zh: '服务器内部错误', common: true, src: 'RFC 9110',
    desc: '服务器遇到未预料的情况导致请求失败，是兜底错误码：任何无法归类的服务端异常（空指针、数据库连接失败、未捕获异常）都会以 500 返回。',
  },
  {
    code: 501, en: 'Not Implemented', zh: '未实现', src: 'RFC 9110',
    desc: '服务器不具备完成该请求所需的功能，例如不支持请求所用的方法。表示「这个功能压根没做」，与 500「做了但出错」相区分。',
  },
  {
    code: 502, en: 'Bad Gateway', zh: '错误网关', common: true, src: 'RFC 9110',
    desc: '充当网关或代理的服务器从上游服务器收到了无效响应。最常见于 nginx 反代场景：后端进程崩溃、未启动或返回了畸形数据。',
  },
  {
    code: 503, en: 'Service Unavailable', zh: '服务不可用', common: true, src: 'RFC 9110',
    desc: '服务器暂时无法处理请求：过载、正在维护或发布中。属于临时状态，响应常携带 Retry-After 头提示恢复时间。',
  },
  {
    code: 504, en: 'Gateway Timeout', zh: '网关超时', common: true, src: 'RFC 9110',
    desc: '网关或代理服务器在规定时间内没有从上游服务器收到响应。后端处理太慢（慢 SQL、下游接口卡死）或网络不通都会导致。',
  },
  {
    code: 505, en: 'HTTP Version Not Supported', zh: 'HTTP 版本不支持', src: 'RFC 9110',
    desc: '服务器不支持或拒绝支持请求所用的 HTTP 协议版本，无法完成处理。如今已很少见。',
  },
  {
    code: 506, en: 'Variant Also Negotiates', zh: '变体协商错误', src: 'RFC 2295',
    desc: '服务器内部配置错误：为响应所选的变体资源自身又发起内容协商，形成无法终止的循环。',
  },
  {
    code: 507, en: 'Insufficient Storage', zh: '存储空间不足', src: 'RFC 4918', tag: 'WebDAV',
    desc: 'WebDAV 扩展：服务器磁盘空间不足，无法存储完成请求所需的内容（如上传的文件）。',
  },
  {
    code: 508, en: 'Loop Detected', zh: '检测到环路', src: 'RFC 5842', tag: 'WebDAV',
    desc: 'WebDAV 扩展：服务器处理请求时检测到无限循环（如集合相互包含）。非 WebDAV 场景中有时被借用表示重定向死循环。',
  },
  {
    code: 509, en: 'Bandwidth Limit Exceeded', zh: '带宽超限', src: 'Apache/cPanel', std: false,
    desc: '非标准状态码：曾被 Apache/cPanel 系主机用于表示服务器的月流量配额已用尽，网站暂停服务直至配额重置。',
  },
  {
    code: 510, en: 'Not Extended', zh: '需要扩展', src: 'RFC 2774',
    desc: '完成该请求需要协议层面的进一步扩展，服务器在响应中说明获取扩展的方式。实际几乎不会遇到。',
  },
  {
    code: 511, en: 'Network Authentication Required', zh: '需要网络认证', src: 'RFC 6585',
    desc: '客户端需要完成网络级认证才能获得访问权限。最典型场景：酒店、机场 WiFi 强制门户（Captive Portal）要求先登录或同意条款。',
  },
  {
    code: 520, en: 'Web Server Returned an Unknown Error', zh: '源站未知错误', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：源站返回了空的、未知的或意外的响应。源站程序崩溃、响应头超长或直接断开连接都会触发。',
  },
  {
    code: 521, en: 'Web Server Is Down', zh: '源站已宕机', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：源站拒绝了来自 Cloudflare 的 TCP 连接，通常是 Web 服务没有运行或防火墙拦截了 Cloudflare IP 段。',
  },
  {
    code: 522, en: 'Connection Timed Out', zh: '源站连接超时', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：与源站的 TCP 连接握手超时。源站过载、防火墙丢包或安全组未放行 Cloudflare 回源 IP 都会导致。',
  },
  {
    code: 523, en: 'Origin Is Unreachable', zh: '源站不可达', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：无法抵达源站，多为 DNS 解析指向了错误 IP、源站下线或网络路由故障。',
  },
  {
    code: 524, en: 'A Timeout Occurred', zh: '源站响应超时', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：与源站 TCP 连接成功，但源站迟迟不返回 HTTP 响应（默认超过 100 秒）。后端任务执行过久是主因。',
  },
  {
    code: 525, en: 'SSL Handshake Failed', zh: 'SSL 握手失败', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：Cloudflare 与源站之间的 TLS 握手失败。源站证书无效、未装证书或双方支持的加密套件不匹配都会导致。',
  },
  {
    code: 526, en: 'Invalid SSL Certificate', zh: 'SSL 证书无效', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：源站的 SSL 证书无效或已过期（SSL 模式为 Full/Full-Strict 时校验失败）。更新源站证书即可恢复。',
  },
  {
    code: 527, en: 'Railgun Error', zh: 'Railgun 错误', src: 'Cloudflare', std: false, tag: 'Cloudflare',
    desc: 'Cloudflare 扩展：Cloudflare 与源站 Railgun 加速服务之间的连接错误。Railgun 服务已于 2024 年下线，该状态码随之成为历史。',
  },
  {
    code: 530, en: 'Origin DNS Error', zh: '源站 DNS 错误', src: 'Cloudflare/Pantheon', std: false,
    desc: 'Cloudflare 用法：源站域名 DNS 解析失败，找不到对应 IP（常伴随 1016/1033 错误码）。Pantheon 平台则用 530 表示站点已冻结或停机。',
  },
  {
    code: 598, en: 'Network Read Timeout Error', zh: '网络读取超时', src: '部分代理', std: false,
    desc: '非标准状态码：一些 HTTP 代理用它表示网络读取超时，语义类似 408 但发生在代理与上游之间。',
  },
  {
    code: 599, en: 'Network Connect Timeout Error', zh: '网络连接超时', src: '部分代理', std: false,
    desc: '非标准状态码：一些 HTTP 代理用它表示网络连接建立超时，语义接近 504，用于区分代理侧的连接故障。',
  },
];

/** code → 条目 索引 */
export const STATUS_MAP: Record<number, StatusItem> = Object.fromEntries(ITEMS.map(it => [it.code, it]));

/** 获取状态码所属分类 */
export const catOf = (code: number): CatKey => `${Math.floor(code / 100)}xx` as CatKey;
