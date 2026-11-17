import {
  LayoutDashboard, UsersRound, GraduationCap, UserRoundCog, ShieldCheck,
  CalendarDays, School, UserCog, Mail, Bell, Megaphone, ChartNoAxesCombined,
  Activity, Flag, Puzzle, Bot, Boxes, LifeBuoy, Settings2, FileClock,
  DatabaseBackup, ScrollText, ClipboardCheck, BookOpenText, Sparkles,
  Palette, LibraryBig,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { can, type Permission } from '@schoolos/shared'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  permission?: Permission
  roles?: string[]
  devOnly?: boolean
}

export interface NavGroup {
  labelKey: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.group.overview',
    items: [
      { to: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/app/notifications', labelKey: 'nav.notifications', icon: Bell },
    ],
  },
  {
    labelKey: 'nav.group.people',
    items: [
      { to: '/app/people/students', labelKey: 'nav.students', icon: GraduationCap, permission: 'students.read' },
      { to: '/app/people/guardians', labelKey: 'nav.guardians', icon: UsersRound, permission: 'students.read' },
      { to: '/app/people/staff', labelKey: 'nav.staff', icon: UserRoundCog, permission: 'students.read' },
      { to: '/app/people/roles', labelKey: 'nav.roles', icon: UserCog, permission: 'school.settings' },
    ],
  },
  {
    labelKey: 'nav.group.school',
    items: [
      { to: '/app/school/settings', labelKey: 'nav.schoolSettings', icon: School, permission: 'school.settings' },
      { to: '/app/school/members', labelKey: 'nav.members', icon: UserCog, permission: 'members.manage' },
      { to: '/app/school/invitations', labelKey: 'nav.invitations', icon: Mail, permission: 'members.manage' },
    ],
  },
  {
    labelKey: 'nav.group.activities',
    items: [
      { to: '/app/activities', labelKey: 'nav.activities', icon: CalendarDays, permission: 'activities.read' },
      { to: '/app/activities/mine', labelKey: 'nav.myActivities', icon: BookOpenText, permission: 'activities.read' },
    ],
  },
  {
    labelKey: 'nav.group.safety',
    items: [
      { to: '/app/safeguarding', labelKey: 'nav.safeguarding', icon: ShieldCheck, permission: 'safeguarding.read' },
      { to: '/app/compliance/retention', labelKey: 'nav.retention', icon: DatabaseBackup, permission: 'compliance.read' },
      { to: '/app/compliance/requests', labelKey: 'nav.compliance', icon: ClipboardCheck, permission: 'compliance.read' },
      { to: '/app/compliance/pack', labelKey: 'compliance.pack', icon: LibraryBig, permission: 'compliance.read' },
      { to: '/app/compliance/audit', labelKey: 'nav.audit', icon: ScrollText, permission: 'compliance.read' },
    ],
  },
  {
    labelKey: 'nav.group.insights',
    items: [
      { to: '/app/ai/suggestions', labelKey: 'nav.ai', icon: Sparkles, permission: 'ai.use' },
      { to: '/app/ai/tools', labelKey: 'nav.aiTools', icon: Bot, permission: 'ai.use' },
      { to: '/app/reports', labelKey: 'nav.reports', icon: ChartNoAxesCombined, permission: 'reports.read' },
    ],
  },
  {
    labelKey: 'nav.group.communication',
    items: [
      { to: '/app/communication/announcements', labelKey: 'nav.announcements', icon: Megaphone, permission: 'messages.read' },
      { to: '/app/communication/messages', labelKey: 'nav.messages', icon: Mail, permission: 'messages.read' },
    ],
  },
  {
    labelKey: 'nav.group.platform',
    items: [
      { to: '/app/platform/status', labelKey: 'nav.status', icon: Activity, permission: 'platform.admin' },
      { to: '/app/platform/flags', labelKey: 'nav.flags', icon: Flag, permission: 'platform.admin' },
      { to: '/app/platform/integrations', labelKey: 'nav.integrations', icon: Puzzle, permission: 'platform.admin' },
      { to: '/app/platform/models', labelKey: 'nav.models', icon: Boxes, permission: 'platform.admin' },
      { to: '/app/platform/support', labelKey: 'nav.support', icon: LifeBuoy },
      { to: '/app/settings', labelKey: 'common.settings', icon: Settings2 },
      { to: '/ui-kit', labelKey: 'uikit.title', icon: Palette, devOnly: true },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

export function visibleNavGroups(role: string | undefined, showUiKit: boolean): NavGroup[] {
  return NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.devOnly && !showUiKit) return false
      if (item.roles && role && !item.roles.includes(role)) return false
      if (item.permission && !can(role, item.permission)) return false
      return true
    }),
  })).filter(group => group.items.length > 0)
}
