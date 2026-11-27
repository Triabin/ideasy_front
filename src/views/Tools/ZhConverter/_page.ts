import ZhConvert from '@/components/icons/ZhConvert.vue';

export default {
  title: '简繁转换',
  menuOrder: 33,
  hidden: false,
  icon: ZhConvert,
  tags: ['简繁转换', '简体', '繁体', 'OpenCC', '中文', '转换', '台湾正体', '香港繁体'],
  desc: '基于 OpenCC 词库的简体 / 繁体中文转换工具，支持词语级精准转换（如「头发→頭髮」「干杯→乾杯」「软件→軟體」），可切换台湾正体、通用繁体、香港繁体及反向转换。可直接输入文本或上传、拖拽最大 50 MB 的 TXT 文件，大文件分块转换并显示进度，结果支持复制与下载。'
}
