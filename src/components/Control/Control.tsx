import React, {forwardRef, useCallback, useImperativeHandle, useRef} from 'react';

import {Button, ButtonProps, Popup} from '@gravity-ui/uikit';
import block from 'bem-cn-lite';

import {PopperPosition, usePopupState} from '../../hooks';
import {ControlSizes} from '../../models';

import './Control.scss';

const b = block('dc-control');

export interface IconProps {
    width: number;
    height: number;
}

export interface ControlProps {
    onClick?: () => void;
    setRef?: (ref: HTMLButtonElement) => void;
    isVerticalView?: boolean;
    tooltipText: string;
    isTooltipHidden?: boolean;
    className?: string;
    href?: string;
    target?: string;
    rel?: string;
    size?: ControlSizes;
    icon: React.FC<IconProps>;
    popupPosition?: PopperPosition;
    buttonExtraProps?: ButtonProps['extraProps'];
}

const ICONS_SIZES = {
    [ControlSizes.M]: 16,
    [ControlSizes.L]: 20,
};

const Control = forwardRef((props: ControlProps, ref) => {
    const {
        onClick,
        className,
        tooltipText,
        isTooltipHidden,
        isVerticalView,
        size = ControlSizes.M,
        icon,
        popupPosition,
        buttonExtraProps: extraProps,
        href,
        target,
        rel,
    } = props;

    const controlRef = useRef<HTMLButtonElement | null>(null);

    const popupState = usePopupState({autoclose: 3000});

    const getTooltipAlign = useCallback(() => {
        if (popupPosition) {
            return popupPosition;
        }

        return isVerticalView ? PopperPosition.LEFT_START : PopperPosition.BOTTOM_END;
    }, [isVerticalView, popupPosition]);

    useImperativeHandle(ref, () => controlRef.current, [controlRef]);

    const position = getTooltipAlign();
    const Icon = icon;
    const iconSize = ICONS_SIZES[size];

    return (
        <React.Fragment>
            <Button
                view="flat-secondary"
                onClick={onClick}
                ref={controlRef}
                onMouseEnter={popupState.open}
                onMouseLeave={popupState.close}
                className={b(null, className)}
                size={size}
                href={href}
                target={target}
                rel={rel}
                extraProps={{
                    'aria-label': tooltipText,
                    ...extraProps,
                }}
            >
                <Button.Icon>
                    <Icon width={iconSize} height={iconSize} />
                </Button.Icon>
            </Button>
            {controlRef.current && (
                <Popup
                    anchorRef={controlRef}
                    open={isTooltipHidden ? false : popupState.visible}
                    onOutsideClick={popupState.close}
                    contentClassName={b('tooltip')}
                    placement={position}
                >
                    <span className={b('tooltip-text')}>{tooltipText}</span>
                </Popup>
            )}
        </React.Fragment>
    );
});

Control.displayName = 'DCControl';

export default Control;
