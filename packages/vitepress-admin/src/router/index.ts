import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../components/layout/MainLayout.vue'
import TopicManager from '../views/topics/TopicManager.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/Home.vue'),
          meta: {
            title: '首页',
            icon: 'HomeOutlined'
          }
        },
        {
          path: 'topics',
          name: 'topics',
          component: TopicManager,
          meta: {
            title: '专题管理',
            icon: 'BookOutlined'
          }
        },
        {
          path: 'articles',
          name: 'articles',
          component: () => import('../views/articles/ArticleManager.vue'),
          meta: {
            title: '文章编辑',
            icon: 'FileTextOutlined'
          }
        },
        {
          path: 'images',
          name: 'images',
          component: () => import('../views/images/ImageLayout.vue'),
          meta: {
            title: '图床管理',
            icon: 'PictureOutlined'
          },
          children: [
            {
              path: '',
              name: 'imageList',
              component: () => import('../views/images/ImageList.vue'),
              meta: {
                title: '图片列表'
              },
              redirect: { name: 'local-images' },
              children: [
                {
                  path: 'local',
                  name: 'local-images',
                  component: () => import('../views/images/LocalImageList.vue'),
                  meta: {
                    title: '本地图片'
                  }
                },
                {
                  path: 'qiniu',
                  name: 'qiniu-images',
                  component: () => import('../views/images/QiniuImageList.vue'),
                  meta: {
                    title: '七牛云图片'
                  }
                }
              ]
            },
            {
              path: 'settings',
              name: 'imageSettings',
              component: () => import('../views/images/ImageSettings.vue'),
              meta: {
                title: '图床设置'
              }
            }
          ]
        }
      ]
    },
    {
      path: '/articles/edit',
      name: 'article-edit',
      component: () => import('../views/articles/ArticleEdit.vue'),
      meta: {
        title: '编辑文章'
      }
    }
  ]
})

export default router
