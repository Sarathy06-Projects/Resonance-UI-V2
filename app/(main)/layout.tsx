import { AppLayout } from "@/components/layout/AppLayout";
import { OnboardingGuard } from "@/components/providers/OnboardingGuard";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OnboardingGuard />
      <AppLayout>{children}</AppLayout>
    </>
  );
}
