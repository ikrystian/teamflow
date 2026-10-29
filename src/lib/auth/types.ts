/** Sesja w kształcie używanym przez moduł projektów (wcześniej NextAuth). */
export type AppSession = {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    /** Rola systemowa: user | manager | admin. */
    role: string;
  };
};
