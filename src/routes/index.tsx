import { createFileRoute } from '@tanstack/react-router'
import { HeroSection } from '@/components/home/hero-section'
import { FeaturesSection } from '@/components/home/features-section'
import { RolesSection } from '@/components/home/roles-section'
import { CtaBanner } from '@/components/home/cta-banner'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { user } = Route.useRouteContext()

  return (
    <>
      <HeroSection user={user} />
      <FeaturesSection />
      <RolesSection />
      <CtaBanner user={user} />
    </>
  )
}
