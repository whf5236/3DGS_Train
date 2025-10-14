import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';

export function useAuthStatus() {

  const userStore = useUserStore();
  const {isAuthenticated} = storeToRefs(userStore) 
  return {isAuthenticated}

}

