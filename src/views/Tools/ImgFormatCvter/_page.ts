import ImgFormatCvter from '@/components/icons/ImgFormatCvter.vue';

export default {
  title: '图片格式转换',
  menuOrder: 30,
  hidden: false,
  icon: ImgFormatCvter,
  tags: ['图片', '格式转换', 'JPG', 'PNG', 'WebP', 'AVIF', 'BMP', 'RAW', '相机原片'],
  desc: '在浏览器本地批量转换图片格式：支持 JPG、PNG、WebP、AVIF、BMP、GIF、TIFF 及相机 RAW（CR2/NEF/ARW/DNG 等）作为输入，输出 JPG / PNG / WebP / BMP 四种格式——RAW 是传感器原始数据，常规格式无法无损还原，故不支持转回 RAW。可调有损质量与透明背景填充色，支持打包 ZIP 下载，图片不会上传。'
}
