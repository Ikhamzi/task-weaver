import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuthUser>("/auth/me")
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return { user, loading, signOut };
}
