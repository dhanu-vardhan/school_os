import {
  Activity, Bell, BookOpenText, Boxes, CalendarDays, ChartNoAxesCombined, ClipboardCheck,
  ClipboardList, Clock, DatabaseBackup, DoorOpen, FileClock, FileText, Flag, GraduationCap,
  HeartPulse, KeyRound, LayoutDashboard, LibraryBig, LifeBuoy, Mail, Megaphone, Monitor,
  Puzzle, School, ScrollText, Settings2, ShieldAlert, ShieldCheck, Sparkles, UserCog,
  UsersRound, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Activity, Bell, BookOpenText, Boxes, CalendarDays, ChartNoAxesCombined, ClipboardCheck,
  ClipboardList, Clock, DatabaseBackup, DoorOpen, FileClock, FileText, Flag, GraduationCap,
  HeartPulse, KeyRound, LayoutDashboard, LibraryBig, LifeBuoy, Mail, Megaphone, Monitor,
  Puzzle, School, ScrollText, Settings2, ShieldAlert, ShieldCheck, Sparkles, UserCog,
  UsersRound, Wallet,
}

export function navIcon(name: string | undefined): LucideIcon {
  return (name && ICONS[name]) || LayoutDashboard
}
