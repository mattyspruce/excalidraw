import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEventHandler,
} from "react";
import { useExcalidrawContainer } from "../App";
import { PropertiesPopover } from "../PropertiesPopover";
import { QuickSearch } from "../QuickSearch";
import { ScrollableList } from "../ScrollableList";
import DropdownMenuSeparator from "../dropdownMenu/DropdownMenuSeparator";
import DropdownMenuItem, {
  DropDownMenuItemBadgeType,
  DropDownMenuItemBadge,
} from "../dropdownMenu/DropdownMenuItem";
import { type FontFamilyValues } from "../../element/types";
import { arrayToList, debounce, getFontFamilyString } from "../../utils";
import { t } from "../../i18n";
import { fontPickerKeyHandler } from "./keyboardNavHandlers";
import { Fonts } from "../../fonts";
import type { ValueOf } from "../../utility-types";
import { isDefaultFont } from "./FontPicker";
import { FONT_FAMILY } from "../../constants";

export interface FontDescriptor {
  value: number;
  text: string;
  badge?: {
    type: ValueOf<typeof DropDownMenuItemBadgeType>;
    placeholder: string;
  };
}

interface FontPickerListProps {
  selectedFontFamily: FontFamilyValues | null;
  hoveredFontFamily: FontFamilyValues | null;
  onSelect: (value: number) => void;
  onHover: (value: number) => void;
  onLeave: () => void;
  onOpen: () => void;
  onClose: () => void;
}

export const FontPickerList = React.memo(
  ({
    selectedFontFamily,
    hoveredFontFamily,
    onSelect,
    onHover,
    onLeave,
    onOpen,
    onClose,
  }: FontPickerListProps) => {
    const { container } = useExcalidrawContainer();
    const [searchTerm, setSearchTerm] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const allFonts = useMemo(
      () =>
        Array.from(Fonts.registered.entries())
          .filter(([_, { metrics }]) => !metrics.hidden)
          .map(([familyId, { metrics, fontFaces }]) => {
            const font = {
              value: familyId,
              text: fontFaces[0].fontFace.family,
            };

            if (metrics.badge === "new") {
              Object.assign(font, {
                badge: {
                  type: DropDownMenuItemBadgeType.GREEN,
                  placeholder: t("fontList.badge.new"),
                },
              });
            }

            return font as FontDescriptor;
          })
          .sort((a, b) =>
            a.text.toLowerCase() > b.text.toLowerCase() ? 1 : -1,
          ),
      [],
    );

    const defaultFonts = useMemo(() => {
      const defaultFontsMap = allFonts
        .filter((font) => isDefaultFont(font.value))
        .reduce((acc, curr) => {
          acc.set(curr.value, curr);
          return acc;
        }, new Map<number, FontDescriptor>());

      return [
        defaultFontsMap.get(FONT_FAMILY.Excalifont),
        defaultFontsMap.get(FONT_FAMILY["Liberation Sans"]),
        defaultFontsMap.get(FONT_FAMILY.Cascadia),
      ] as Array<FontDescriptor>;
    }, [allFonts]);

    const otherFonts = useMemo(
      () => allFonts.filter((font) => !isDefaultFont(font.value)),
      [allFonts],
    );

    const filteredFonts = useMemo(
      () =>
        arrayToList(
          [...defaultFonts, ...otherFonts].filter((font) =>
            font.text?.toLowerCase().includes(searchTerm),
          ),
        ),
      [defaultFonts, otherFonts, searchTerm],
    );

    const hoveredFont = useMemo(() => {
      let font;

      if (hoveredFontFamily) {
        font = filteredFonts.find((font) => font.value === hoveredFontFamily);
      } else if (selectedFontFamily) {
        font = filteredFonts.find((font) => font.value === selectedFontFamily);
      }

      if (!font && searchTerm) {
        if (filteredFonts[0]?.value) {
          // hover first element on search
          onHover(filteredFonts[0].value);
        } else {
          // re-render cache on no results
          onLeave();
        }
      }

      return font;
    }, [
      hoveredFontFamily,
      selectedFontFamily,
      searchTerm,
      filteredFonts,
      onHover,
      onLeave,
    ]);

    const onKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
      (event) => {
        const handled = fontPickerKeyHandler({
          event,
          inputRef,
          hoveredFont,
          filteredFonts,
          onSelect,
          onHover,
          onClose,
        });

        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      [hoveredFont, filteredFonts, onSelect, onHover, onClose],
    );

    useEffect(() => {
      onOpen();

      return () => {
        onClose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const defaultFilteredFonts = useMemo(
      () => filteredFonts.filter((font) => isDefaultFont(font.value)),
      [filteredFonts],
    );
    const otherFilteredFonts = useMemo(
      () => filteredFonts.filter((font) => !isDefaultFont(font.value)),
      [filteredFonts],
    );

    const renderFont = (font: FontDescriptor) => (
      <DropdownMenuItem
        key={font.value}
        value={font.value}
        textStyle={{
          fontFamily: getFontFamilyString({ fontFamily: font.value }),
        }}
        hovered={font.value === hoveredFont?.value}
        selected={font.value === selectedFontFamily}
        // allow to tab between search and selected font
        tabIndex={font.value === selectedFontFamily ? 0 : -1}
        onClick={(e) => {
          onSelect(Number(e.currentTarget.value));
        }}
        onMouseMove={() => {
          if (hoveredFont?.value !== font.value) {
            onHover(font.value);
          }
        }}
      >
        {font.text}
        {font.badge && (
          <DropDownMenuItemBadge type={font.badge.type}>
            {font.badge.placeholder}
          </DropDownMenuItemBadge>
        )}
      </DropdownMenuItem>
    );

    return (
      <PropertiesPopover
        className="properties-content"
        container={container}
        style={{ width: "15rem" }}
        onClose={onClose}
        onPointerLeave={onLeave}
        onKeyDown={onKeyDown}
      >
        <QuickSearch
          ref={inputRef}
          placeholder={t("quickSearch.placeholder")}
          onChange={debounce(setSearchTerm, 20)}
        />
        <ScrollableList
          className="dropdown-menu max-items-8 manual-hover"
          placeholder={t("fontList.empty")}
        >
          {!!defaultFilteredFonts.length &&
            defaultFilteredFonts.map(renderFont)}
          {!!defaultFilteredFonts.length && !!otherFilteredFonts.length && (
            <DropdownMenuSeparator />
          )}
          {!!otherFilteredFonts.length && otherFilteredFonts.map(renderFont)}
        </ScrollableList>
      </PropertiesPopover>
    );
  },
  (prev, next) =>
    prev.selectedFontFamily === next.selectedFontFamily &&
    prev.hoveredFontFamily === next.hoveredFontFamily,
);
