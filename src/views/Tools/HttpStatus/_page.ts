import HttpStatus from '@/components/icons/HttpStatus.vue';

export default {
  title: 'HTTP状态码',
  menuOrder: 24,
  hidden: false,
  icon: HttpStatus,
  tags: ['HTTP', '状态码', 'StatusCode', '404', '500', '接口报错', 'REST', 'Web'],
  desc: 'HTTP 状态码速查手册。涵盖 IANA 注册的全量 1xx～5xx 标准状态码及 nginx、Cloudflare 常见扩展码，支持按状态码、英文名称、中文含义与 RFC 出处搜索，按信息响应、成功、重定向、客户端错误、服务端错误分类浏览，一键复制状态码。'
}
