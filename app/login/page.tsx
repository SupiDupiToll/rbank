import { LoginRedirect } from "@/components/login-redirect";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LoginRedirect redirectTo={params.redirect} />;
}
