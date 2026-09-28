/* ─── Icon vocabulary ─────────────────────────────────────────────────────────
 *
 * Every icon in the admin panel comes from Tabler (https://tabler.io/icons) and
 * is named here for what it means in this product, not for what it looks like.
 * A screen imports `IconJobs`, not `IconBriefcase` — so when the job icon
 * changes it changes in one line and every screen follows.
 *
 * Before this, icons came from three places at once: react-icons/fi in eight
 * files, 127 hand-drawn inline <svg> paths, and a few emoji. Same concept,
 * different glyph, different stroke weight, different size, depending on which
 * screen you were on.
 */
import React from "react";
import {
  IconActivity,
  IconAlertCircle,
  IconAlertOctagon,
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowDownRight,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUpRight,
  IconArrowsSort,
  IconBan,
  IconBell,
  IconBriefcase,
  IconBuildingBank,
  IconCalendarEvent,
  IconCash,
  IconChartBar,
  IconChartPie,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCircleCheck,
  IconCircleX,
  IconClockHour4,
  IconCoin,
  IconColumns,
  IconCopy,
  IconCreditCard,
  IconDotsVertical,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconFilter,
  IconFlag,
  IconGavel,
  IconHourglass,
  IconInbox,
  IconInfoCircle,
  IconLayoutDashboard,
  IconLifebuoy,
  IconLink,
  IconLoader2,
  IconLock,
  IconLogout,
  IconMail,
  IconMapPin,
  IconMenu2,
  IconMessage,
  IconMessageCircle,
  IconMinus,
  IconPencil,
  IconPercentage,
  IconPhone,
  IconPhoto,
  IconPlus,
  IconRadio,
  IconRefresh,
  IconReceipt,
  IconSearch,
  IconSend,
  IconSettings,
  IconShieldLock,
  IconStar,
  IconStarFilled,
  IconTargetArrow,
  IconTools,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconUserCircle,
  IconUserPlus,
  IconUsers,
  IconVolume,
  IconWallet,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { ICON_STROKE, iconSize } from "../theme/tokens";

/* ── Navigation ─────────────────────────────────────────────────────────── */
export const IconDashboard = IconLayoutDashboard;
export const IconUserManagement = IconUsers;
export const IconJobs = IconBriefcase;
export const IconFinancials = IconCoin;
export const IconSkills = IconTargetArrow;
export const IconLocations = IconMapPin;
export const IconChats = IconMessage;
export const IconNotifications = IconBell;
export const IconRoles = IconShieldLock;
export const IconReports = IconChartBar;
export const IconSettingsNav = IconSettings;
export const IconHelpSupport = IconLifebuoy;
export const IconFormSubmissions = IconInbox;
export const IconDisputes = IconGavel;
export const IconLogs = IconAlertOctagon;

/* ── Money ──────────────────────────────────────────────────────────────── */
export const IconEscrow = IconLock;
/** A credential or secret — distinct from escrow, which is money held. */
export const IconSecret = IconLock;
export const IconWithdrawal = IconWallet;
export const IconRevenue = IconCash;
export const IconTransaction = IconArrowsSort;
export const IconCommission = IconPercentage;
export const IconPayout = IconBuildingBank;
export const IconPaymentMethod = IconCreditCard;
export const IconInvoice = IconReceipt;

/* ── Metrics and trend ──────────────────────────────────────────────────── */
export const IconTrendUp = IconTrendingUp;
export const IconTrendDown = IconTrendingDown;
export const IconDeltaUp = IconArrowUpRight;
export const IconDeltaDown = IconArrowDownRight;
export const IconDeltaFlat = IconMinus;
export const IconPieBreakdown = IconChartPie;
export const IconBarBreakdown = IconChartBar;
export const IconActivityFeed = IconActivity;

/* ── Actions ────────────────────────────────────────────────────────────── */
export const IconExportCsv = IconFileTypeCsv;
export const IconExportPdf = IconFileTypePdf;
export const IconExport = IconDownload;
export const IconRefreshAction = IconRefresh;
export const IconRetry = IconArrowBackUp;
export const IconSendNow = IconSend;
export const IconEdit = IconPencil;
export const IconDelete = IconTrash;
export const IconAdd = IconPlus;
export const IconClose = IconX;
export const IconMore = IconDotsVertical;
export const IconView = IconEye;
export const IconHide = IconEyeOff;
export const IconDuplicate = IconCopy;
export const IconOpenExternal = IconExternalLink;
export const IconCopyLink = IconLink;
export const IconSignOut = IconLogout;
export const IconMenu = IconMenu2;

/* ── Form and table controls ────────────────────────────────────────────── */
export const IconSearchControl = IconSearch;
export const IconDateRange = IconCalendarEvent;
export const IconFilterControl = IconFilter;
export const IconSort = IconArrowsSort;
export const IconColumnPicker = IconColumns;
export const IconChevronDownControl = IconChevronDown;
export const IconChevronUpControl = IconChevronUp;
export const IconPagePrev = IconChevronLeft;
export const IconPageNext = IconChevronRight;
/** Row / nav disclosure — the same glyph as "next page", different meaning. */
export const IconDisclosure = IconChevronRight;
export const IconBack = IconArrowLeft;
export const IconForward = IconArrowRight;

/* ── Status ─────────────────────────────────────────────────────────────── */
export const IconSuccess = IconCircleCheck;
export const IconFailure = IconCircleX;
export const IconPending = IconClockHour4;
export const IconWaiting = IconHourglass;
export const IconWarning = IconAlertTriangle;
export const IconError = IconAlertCircle;
export const IconInfo = IconInfoCircle;
export const IconBlocked = IconBan;
export const IconFlagged = IconFlag;
export const IconVerified = IconCheck;
export const IconLoading = IconLoader2;

/* ── People and content ─────────────────────────────────────────────────── */
export const IconPerson = IconUserCircle;
export const IconNewUser = IconUserPlus;
export const IconEmail = IconMail;
export const IconPhoneNumber = IconPhone;
export const IconMessageThread = IconMessageCircle;
export const IconDocument = IconFileText;
export const IconGlobe = IconWorld;
export const IconRating = IconStar;
/** Solid star for a filled rating — the outline reads as "empty" beside it. */
export const IconRatingFilled = IconStarFilled;
export const IconImage = IconPhoto;
export const IconSkillTag = IconTools;
export const IconBroadcast = IconRadio;
export const IconSound = IconVolume;

export { iconSize };

/* ── Uniform rendering ──────────────────────────────────────────────────────
 *
 * Tabler components take `size` and `stroke`. Left to each call site those
 * drifted: 14px here, 20px there, default stroke 2 next to a 1.5. `<Ico>`
 * applies the house defaults so an icon looks the same wherever it lands.
 */
export type TablerIcon = React.ComponentType<{
  size?: number | string;
  stroke?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}>;

export const Ico: React.FC<{
  icon: TablerIcon;
  size?: number;
  stroke?: number;
  color?: string;
  style?: React.CSSProperties;
  /** Screen-reader label. Omit for icons that only decorate adjacent text. */
  title?: string;
}> = ({ icon: Component, size = iconSize.md, stroke = ICON_STROKE, color, style, title }) => (
  <span
    aria-hidden={title ? undefined : true}
    aria-label={title}
    role={title ? "img" : undefined}
    style={{ display: "inline-flex", flexShrink: 0, lineHeight: 0, ...style }}
  >
    <Component size={size} stroke={stroke} color={color ?? "currentColor"} />
  </span>
);

export default Ico;
