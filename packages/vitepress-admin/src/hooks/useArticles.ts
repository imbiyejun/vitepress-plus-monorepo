import { ref } from 'vue'
import { useTopics } from './useTopics'

interface Article {
  id: string
  title: string
  path: string
  createTime: string
}

const articles = ref<Article[]>([])

export function useArticles() {
  const { selectedTopic: _selectedTopic } = useTopics()

  const loadArticles = async (_topicId: string) => {
    try {
      // 这里将实现从服务器加载文章列表的逻辑
      // const response = await fetch(`/api/topics/${topicId}/articles`);
      // articles.value = await response.json();
    } catch (error) {
      console.error('Failed to load articles:', error)
    }
  }

  const addArticle = async (_article: Omit<Article, 'id' | 'createTime'>) => {
    try {
      // 这里将实现添加文章的逻辑
      // const response = await fetch(`/api/topics/${selectedTopic.value?.id}/articles`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(article)
      // });
      // const newArticle = await response.json();
      // articles.value.push(newArticle);
    } catch (error) {
      console.error('Failed to add article:', error)
      throw error
    }
  }

  const editArticle = async (article: Article) => {
    try {
      // 这里将实现编辑文章的逻辑
      // const response = await fetch(`/api/articles/${article.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(article)
      // });
      // const updatedArticle = await response.json();

      const index = articles.value.findIndex(a => a.id === article.id)
      if (index !== -1) {
        articles.value[index] = article
      }
    } catch (error) {
      console.error('Failed to edit article:', error)
      throw error
    }
  }

  const deleteArticle = async (articleId: string) => {
    try {
      // 这里将实现删除文章的逻辑
      // await fetch(`/api/articles/${articleId}`, {
      //   method: 'DELETE'
      // });

      articles.value = articles.value.filter(a => a.id !== articleId)
    } catch (error) {
      console.error('Failed to delete article:', error)
      throw error
    }
  }

  return {
    articles,
    loadArticles,
    addArticle,
    editArticle,
    deleteArticle
  }
}
