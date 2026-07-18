import { create } from 'zustand';
import { MockHeadline } from '../mock';

interface NewsStore {
  articles: MockHeadline[];
  setArticles: (articles: MockHeadline[]) => void;
  getById: (id: string) => MockHeadline | undefined;
}

export const useNewsStore = create<NewsStore>((set, get) => ({
  articles: [],
  setArticles: (articles) => set({ articles }),
  getById: (id) => get().articles.find(a => a.id === id),
}));
