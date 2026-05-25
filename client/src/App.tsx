import { lazy, Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppLayout } from './components/AppLayout';
import { PageLoader } from './components/PageLoader';

/**
 * HARD RULE #1: Hash routing only. Router uses hook={useHashLocation}.
 * All page components are code-split via React.lazy() so only the shell
 * and the current page's chunk load on the initial visit.
 *
 * Pattern for named exports: lazy(() => import('./pages/X').then(m => ({ default: m.X })))
 */

// ---- Core ----
const Dashboard          = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const NotFound           = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// ---- Emergency (outside layout — lazy but simple) ----
const EmergencyMode      = lazy(() => import('./pages/EmergencyMode').then(m => ({ default: m.EmergencyMode })));

// ---- Session pages ----
const PersonalCRM        = lazy(() => import('./pages/PersonalCRM').then(m => ({ default: m.PersonalCRM })));
const FinancialHub       = lazy(() => import('./pages/FinancialHub').then(m => ({ default: m.FinancialHub })));
const AIAssistant        = lazy(() => import('./pages/AIAssistant').then(m => ({ default: m.AIAssistant })));
const DocumentVault      = lazy(() => import('./pages/DocumentVault').then(m => ({ default: m.DocumentVault })));
const HealthHub          = lazy(() => import('./pages/HealthHub').then(m => ({ default: m.HealthHub })));
const ParentalControls   = lazy(() => import('./pages/ParentalControls').then(m => ({ default: m.ParentalControls })));
const KidsZone           = lazy(() => import('./pages/KidsZone').then(m => ({ default: m.KidsZone })));
const SpecialNeedsHub    = lazy(() => import('./pages/SpecialNeedsHub').then(m => ({ default: m.SpecialNeedsHub })));
const AthleteHub         = lazy(() => import('./pages/AthleteHub').then(m => ({ default: m.AthleteHub })));
const SocialHub          = lazy(() => import('./pages/SocialHub').then(m => ({ default: m.SocialHub })));
const WeeklyRecap        = lazy(() => import('./pages/WeeklyRecap').then(m => ({ default: m.WeeklyRecap })));
const StreaksAndWins     = lazy(() => import('./pages/StreaksAndWins').then(m => ({ default: m.StreaksAndWins })));
const StudentMode        = lazy(() => import('./pages/StudentMode').then(m => ({ default: m.StudentMode })));
const BusinessHub        = lazy(() => import('./pages/BusinessHub').then(m => ({ default: m.BusinessHub })));
const Notifications      = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const PersonalFinanceHub = lazy(() => import('./pages/PersonalFinanceHub').then(m => ({ default: m.PersonalFinanceHub })));
const RelationshipsHub   = lazy(() => import('./pages/RelationshipsHub').then(m => ({ default: m.RelationshipsHub })));
const LearningHub        = lazy(() => import('./pages/LearningHub').then(m => ({ default: m.LearningHub })));
const HomePropertyHub    = lazy(() => import('./pages/HomePropertyHub').then(m => ({ default: m.HomePropertyHub })));
const AICoach            = lazy(() => import('./pages/AICoach').then(m => ({ default: m.AICoach })));

// ---- Enhancements 26–35 ----
const PrivacyDashboard   = lazy(() => import('./pages/PrivacyDashboard').then(m => ({ default: m.PrivacyDashboard })));
const CredentialBridge   = lazy(() => import('./pages/CredentialBridge').then(m => ({ default: m.CredentialBridge })));
const AgentTasks         = lazy(() => import('./pages/AgentTasks').then(m => ({ default: m.AgentTasks })));
const VoiceMode          = lazy(() => import('./pages/VoiceMode').then(m => ({ default: m.VoiceMode })));
const LifeTimeline       = lazy(() => import('./pages/LifeTimeline').then(m => ({ default: m.LifeTimeline })));
const EstateVault        = lazy(() => import('./pages/EstateVault').then(m => ({ default: m.EstateVault })));
const TravelHub          = lazy(() => import('./pages/TravelHub').then(m => ({ default: m.TravelHub })));
const GroceryHub         = lazy(() => import('./pages/GroceryHub').then(m => ({ default: m.GroceryHub })));
const CareerHub          = lazy(() => import('./pages/CareerHub').then(m => ({ default: m.CareerHub })));
const PredictiveInsights = lazy(() => import('./pages/PredictiveInsights').then(m => ({ default: m.PredictiveInsights })));
const AdvisorPlatform    = lazy(() => import('./pages/AdvisorPlatform').then(m => ({ default: m.AdvisorPlatform })));

// ---- Enhancements 36–40 ----
const DigitalTwin        = lazy(() => import('./pages/DigitalTwin').then(m => ({ default: m.DigitalTwin })));
const CompanionMode      = lazy(() => import('./pages/CompanionMode').then(m => ({ default: m.CompanionMode })));
const PetHub             = lazy(() => import('./pages/PetHub').then(m => ({ default: m.PetHub })));
const SleepCoach         = lazy(() => import('./pages/SleepCoach').then(m => ({ default: m.SleepCoach })));
const LegalHub           = lazy(() => import('./pages/LegalHub').then(m => ({ default: m.LegalHub })));

// ---- Enhancements 42–46 ----
const AccountabilityCircles = lazy(() => import('./pages/AccountabilityCircles').then(m => ({ default: m.AccountabilityCircles })));
const BillNegotiation    = lazy(() => import('./pages/BillNegotiation').then(m => ({ default: m.BillNegotiation })));
const WidgetSettings     = lazy(() => import('./pages/WidgetSettings').then(m => ({ default: m.WidgetSettings })));
const CalendarHub        = lazy(() => import('./pages/CalendarHub').then(m => ({ default: m.CalendarHub })));
const FinancialScore     = lazy(() => import('./pages/FinancialScore').then(m => ({ default: m.FinancialScore })));

// ---- Tier 2 Enhancements 23-32 ----
const EnergyScheduler    = lazy(() => import('./pages/EnergyScheduler').then(m => ({ default: m.EnergyScheduler })));
const BurnoutInsights    = lazy(() => import('./pages/BurnoutInsights').then(m => ({ default: m.BurnoutInsights })));
const ReferralHub        = lazy(() => import('./pages/ReferralHub').then(m => ({ default: m.ReferralHub })));

// ---- New spec enhancements ----
const PregnancyHub       = lazy(() => import('./pages/PregnancyHub').then(m => ({ default: m.PregnancyHub })));
const DashboardCustomize = lazy(() => import('./pages/DashboardCustomize').then(m => ({ default: m.DashboardCustomize })));

// ---- Phase 4 — Safety, Privacy, Webhooks, Admin, SSO ----
const SafetyTrustPolicy  = lazy(() => import('./pages/SafetyTrustPolicy').then(m => ({ default: m.SafetyTrustPolicy })));
const PrivacyDisclosure  = lazy(() => import('./pages/PrivacyDisclosure').then(m => ({ default: m.PrivacyDisclosure })));
const WebhookSettingsPage = lazy(() => import('./pages/WebhookSettings').then(m => ({ default: m.WebhookSettingsPage })));
const SuperDashboard     = lazy(() => import('./pages/admin/SuperDashboard').then(m => ({ default: m.SuperDashboard })));
const SsoPortal          = lazy(() => import('./pages/SsoPortal').then(m => ({ default: m.SsoPortal })));

// ---- Enhancement 1-3: Three-Tier Memory System ----
const MemoryHub          = lazy(() => import('./pages/MemoryHub').then(m => ({ default: m.MemoryHub })));

// ---- Enhancement 4-6: Onboarding ----
const Onboarding         = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));

// ---- Enhancement 7-8: Briefing & Weekly Review ----
const WeeklyReview       = lazy(() => import('./pages/WeeklyReview').then(m => ({ default: m.WeeklyReview })));

// ---- Session 14 Enhancements 1-8 ----
const LifeScore          = lazy(() => import('./pages/LifeScore').then(m => ({ default: m.LifeScore })));
const DailyBriefing      = lazy(() => import('./pages/DailyBriefing').then(m => ({ default: m.DailyBriefing })));
const Goals              = lazy(() => import('./pages/Goals').then(m => ({ default: m.Goals })));
const Journal            = lazy(() => import('./pages/Journal').then(m => ({ default: m.Journal })));
const EventsTimeline     = lazy(() => import('./pages/EventsTimeline').then(m => ({ default: m.EventsTimeline })));
const PrivacyVault       = lazy(() => import('./pages/PrivacyVault').then(m => ({ default: m.PrivacyVault })));
const AIChat             = lazy(() => import('./pages/AIChat').then(m => ({ default: m.AIChat })));

// ---- Upgraded legacy hubs ----
const FamilyHub          = lazy(() => import('./pages/FamilyHub').then(m => ({ default: m.FamilyHub })));
const SmartKitchen       = lazy(() => import('./pages/SmartKitchen').then(m => ({ default: m.SmartKitchen })));
const InboxIntelligence  = lazy(() => import('./pages/InboxIntelligence').then(m => ({ default: m.InboxIntelligence })));
const SituationAwareness = lazy(() => import('./pages/SituationAwareness').then(m => ({ default: m.SituationAwareness })));
const LifeEvents         = lazy(() => import('./pages/LifeEvents').then(m => ({ default: m.LifeEvents })));
const TravelMode         = lazy(() => import('./pages/TravelMode').then(m => ({ default: m.TravelMode })));
const FamilyNetwork      = lazy(() => import('./pages/FamilyNetwork').then(m => ({ default: m.FamilyNetwork })));
const AppIntegrations    = lazy(() => import('./pages/AppIntegrations').then(m => ({ default: m.AppIntegrations })));
const ProfileSelect      = lazy(() => import('./pages/ProfileSelect').then(m => ({ default: m.ProfileSelect })));

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Router hook={useHashLocation}>
        <Switch>
          {/* Emergency Mode is intentionally OUTSIDE the layout chrome */}
          <Route path="/emergency" component={EmergencyMode} />

          {/* SSO Partner Portal — outside layout chrome, standalone page */}
          <Route path="/sso" component={SsoPortal} />

          {/* Onboarding wizard — outside layout chrome */}
          <Route path="/onboard" component={Onboarding} />

          {/* All other routes render inside the app shell */}
          <Route>
            <AppLayout>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/contacts" component={PersonalCRM} />
                  <Route path="/financial" component={FinancialHub} />
                  <Route path="/assistant" component={AIAssistant} />
                  <Route path="/documents" component={DocumentVault} />
                  <Route path="/health" component={HealthHub} />
                  <Route path="/parental" component={ParentalControls} />
                  <Route path="/kids" component={KidsZone} />
                  <Route path="/special-needs" component={SpecialNeedsHub} />
                  <Route path="/athlete" component={AthleteHub} />
                  <Route path="/social" component={SocialHub} />
                  <Route path="/recap" component={WeeklyRecap} />
                  <Route path="/streaks" component={StreaksAndWins} />
                  <Route path="/student" component={StudentMode} />
                  <Route path="/business" component={BusinessHub} />
                  <Route path="/family" component={FamilyHub} />
                  <Route path="/kitchen" component={SmartKitchen} />
                  <Route path="/inbox" component={InboxIntelligence} />
                  <Route path="/awareness" component={SituationAwareness} />
                  <Route path="/life-events" component={LifeEvents} />
                  <Route path="/travel-classic" component={TravelMode} />
                  <Route path="/network" component={FamilyNetwork} />
                  <Route path="/apps" component={AppIntegrations} />
                  <Route path="/profiles" component={ProfileSelect} />
                  <Route path="/notifications" component={Notifications} />
                  <Route path="/personal-finance" component={PersonalFinanceHub} />
                  <Route path="/relationships" component={RelationshipsHub} />
                  <Route path="/learning" component={LearningHub} />
                  <Route path="/home-property" component={HomePropertyHub} />
                  <Route path="/coach" component={AICoach} />
                  <Route path="/settings/privacy" component={PrivacyDashboard} />
                  <Route path="/credential-bridge" component={CredentialBridge} />
                  <Route path="/agent" component={AgentTasks} />
                  <Route path="/voice" component={VoiceMode} />
                  <Route path="/timeline" component={LifeTimeline} />
                  <Route path="/estate" component={EstateVault} />
                  <Route path="/travel" component={TravelHub} />
                  <Route path="/grocery" component={GroceryHub} />
                  <Route path="/career" component={CareerHub} />
                  <Route path="/insights" component={PredictiveInsights} />
                  <Route path="/advisor" component={AdvisorPlatform} />
                  <Route path="/digital-twin" component={DigitalTwin} />
                  <Route path="/companion" component={CompanionMode} />
                  <Route path="/pets" component={PetHub} />
                  <Route path="/sleep" component={SleepCoach} />
                  <Route path="/legal" component={LegalHub} />
                  <Route path="/circles" component={AccountabilityCircles} />
                  <Route path="/bills" component={BillNegotiation} />
                  <Route path="/widgets" component={WidgetSettings} />
                  <Route path="/calendar" component={CalendarHub} />
                  <Route path="/financial-score" component={FinancialScore} />
                  <Route path="/memory" component={MemoryHub} />
                  <Route path="/review" component={WeeklyReview} />
                  {/* Session 14 Enhancements 1-8 */}
                  <Route path="/lifescore" component={LifeScore} />
                  <Route path="/briefing" component={DailyBriefing} />
                  <Route path="/goals" component={Goals} />
                  <Route path="/journal" component={Journal} />
                  <Route path="/events" component={EventsTimeline} />
                  <Route path="/privacy" component={PrivacyVault} />
                  <Route path="/chat" component={AIChat} />
                  {/* Tier 2 Enhancements 23-32 */}
                  <Route path="/energy"   component={EnergyScheduler} />
                  <Route path="/burnout"  component={BurnoutInsights} />
                  <Route path="/referral" component={ReferralHub} />
                  {/* New spec enhancements */}
                  <Route path="/pregnancy"           component={PregnancyHub} />
                  <Route path="/dashboard/customize" component={DashboardCustomize} />
                  {/* Phase 4 — Safety, Privacy, Webhooks, Admin */}
                  <Route path="/safety"          component={SafetyTrustPolicy} />
                  <Route path="/privacy-policy"  component={PrivacyDisclosure} />
                  <Route path="/webhooks"        component={WebhookSettingsPage} />
                  <Route path="/admin"           component={SuperDashboard} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </AppLayout>
          </Route>
        </Switch>
      </Router>
    </Suspense>
  );
}
