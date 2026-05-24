import { Router, Route, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { PersonalCRM } from './pages/PersonalCRM';
import { FinancialHub } from './pages/FinancialHub';
import { AIAssistant } from './pages/AIAssistant';
import { DocumentVault } from './pages/DocumentVault';
import { HealthHub } from './pages/HealthHub';
import { ParentalControls } from './pages/ParentalControls';
import { KidsZone } from './pages/KidsZone';
import { SpecialNeedsHub } from './pages/SpecialNeedsHub';
import { AthleteHub } from './pages/AthleteHub';
import { SocialHub } from './pages/SocialHub';
import { WeeklyRecap } from './pages/WeeklyRecap';
import { StreaksAndWins } from './pages/StreaksAndWins';
import { EmergencyMode } from './pages/EmergencyMode';
import { StudentMode } from './pages/StudentMode';
import { BusinessHub } from './pages/BusinessHub';
import { FamilyHub } from './pages/FamilyHub';
import { SmartKitchen } from './pages/SmartKitchen';
import { InboxIntelligence } from './pages/InboxIntelligence';
import { SituationAwareness } from './pages/SituationAwareness';
import { LifeEvents } from './pages/LifeEvents';
import { TravelMode } from './pages/TravelMode';
import { FamilyNetwork } from './pages/FamilyNetwork';
import { AppIntegrations } from './pages/AppIntegrations';
import { ProfileSelect } from './pages/ProfileSelect';
import { Notifications } from './pages/Notifications';
import { PersonalFinanceHub } from './pages/PersonalFinanceHub';
import { RelationshipsHub } from './pages/RelationshipsHub';
import { LearningHub }        from './pages/LearningHub';
import { HomePropertyHub }   from './pages/HomePropertyHub';
import { AICoach }           from './pages/AICoach';
import { PrivacyDashboard }  from './pages/PrivacyDashboard';    // Enhancement 41
import { CredentialBridge } from './pages/CredentialBridge';     // Enhancement 26
import { AgentTasks }       from './pages/AgentTasks';           // Enhancement 27
import { VoiceMode }        from './pages/VoiceMode';            // Enhancement 28
import { LifeTimeline }     from './pages/LifeTimeline';         // Enhancement 29
import { EstateVault }      from './pages/EstateVault';          // Enhancement 30
import { NotFound } from './pages/NotFound';

/**
 * HARD RULE #1: Hash routing only. Router uses hook={useHashLocation}.
 * Never use BrowserRouter (Wouter doesn't have one, but the spirit of the rule
 * is "no History API routing"). Hash routing ensures the app works inside
 * sandboxed iframes and static hosts without server rewrites.
 */
export function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        {/* Emergency Mode is intentionally OUTSIDE the layout chrome -- accessed without login (Session 10) */}
        <Route path="/emergency" component={EmergencyMode} />

        {/* All other routes render inside the app shell */}
        <Route>
          <AppLayout>
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
              <Route path="/travel" component={TravelMode} />
              <Route path="/network" component={FamilyNetwork} />
              <Route path="/apps" component={AppIntegrations} />
              <Route path="/profiles" component={ProfileSelect} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/personal-finance" component={PersonalFinanceHub} />
              <Route path="/relationships" component={RelationshipsHub} />
              <Route path="/learning"       component={LearningHub} />
              <Route path="/home-property"  component={HomePropertyHub} />
              <Route path="/coach"          component={AICoach} />
              <Route path="/settings/privacy"  component={PrivacyDashboard} />
              <Route path="/credential-bridge" component={CredentialBridge} />
              <Route path="/agent"             component={AgentTasks} />
              <Route path="/voice"             component={VoiceMode} />
              <Route path="/timeline"          component={LifeTimeline} />
              <Route path="/estate"            component={EstateVault} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </Router>
  );
}
