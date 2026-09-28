import React from "react";
import {
  Ico,
  IconChevronDownControl,
  IconChevronUpControl,
  IconSort,
  iconSize,
} from "../../components/icons";
import { color } from "../../theme/tokens";

/** Colour of the indicator while the column is not the one being sorted. */
const IDLE = "#CBD5E1";

export const SortIcon: React.FC<{ active: boolean; direction?: "asc" | "desc" }> = ({ active, direction }) => {
  if (active && direction === "asc")
    return <Ico icon={IconChevronUpControl} size={iconSize.sm} color={color.primary} />;
  if (active && direction === "desc")
    return <Ico icon={IconChevronDownControl} size={iconSize.sm} color={color.primary} />;
  return <Ico icon={IconSort} size={iconSize.sm} color={IDLE} />;
};
