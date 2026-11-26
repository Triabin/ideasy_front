import ImgPalette from '@/components/icons/ImgPalette.vue';

export default {
  title: '图片取色',
  menuOrder: 26,
  hidden: false,
  icon: ImgPalette,
  tags: ['取色', 'Palette', '配色', '图片', '颜色提取', '主题色'],
  desc: '上传一张图片，自动提取主色盘：逐像素统计每种颜色的数量，按占比排序生成配色方案，展示 HEX/RGB/HSL 并支持一键复制；配色可实时应用到渐变背景、占比色块与示例界面预览，还可一键铺为整个页面背景。全部分析在浏览器本地完成，图片不会上传。'
}
