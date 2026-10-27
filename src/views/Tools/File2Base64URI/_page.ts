import Base64Edit from '@/components/icons/Base64Edit.vue';

export default {
    title: '文件转Base64URI',
    menuOrder: 16,
    icon: Base64Edit,
    hidden: false,
    tags: ['文件', 'Base64', 'DataURI'],
    desc: '将文件转换为Base64DataURI格式，全部在浏览器本地完成，文件不会上传到任何服务器。内置文件体积告警体系，超限文件可强制运行。'
}
