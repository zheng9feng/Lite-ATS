import { useTranslation } from 'react-i18next'
import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  const { t } = useTranslation()

  return (
    <ContentSection
      title={t('settingsPage.profile.title')}
      desc={t('settingsPage.profile.description')}
    >
      <ProfileForm />
    </ContentSection>
  )
}
