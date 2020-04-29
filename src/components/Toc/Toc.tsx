import React from 'react';
import block from 'bem-cn-lite';
import {parse} from 'url';

import {TocData, Router, TocItem, Lang} from '../../models';
import {ToggleArrow} from '../ToggleArrow';
import {HTML} from '../HTML';
import {TextInput} from '../TextInput';

import i18n from './i18n';

import './Toc.scss';

const b = block('dc-toc');
const HEADER_HEIGHT = 0;

function isActiveItem(router: Router, href: string) {
    return router.pathname === parse(href).pathname;
}

export interface TocProps extends TocData {
    router: Router;
    lang: Lang;
}

interface FlatTocItem {
    name: string;
    href?: string;
    parents: string[];
    opened?: boolean;
}

interface TocState {
    flatToc: Record<string, FlatTocItem>;
    filteredItemIds: string[];
    filterName: string;
    contentScrolled: boolean;
    activeId?: string | null;
}

export class Toc extends React.Component<TocProps, TocState> {

    contentRef = React.createRef<HTMLDivElement>();
    rootRef = React.createRef<HTMLDivElement>();

    containerEl: HTMLElement | null = null;
    footerEl: HTMLElement | null = null;

    state: TocState = {
        flatToc: {},
        filteredItemIds: [],
        filterName: '',
        contentScrolled: false,
        activeId: null,
    };

    componentDidMount() {
        i18n.changeLanguage(this.props.lang);
        this.containerEl = document.querySelector('.Layout__content');
        this.footerEl = document.querySelector('.Layout__footer');
        this.setTocHeight();
        this.setState(this.getState(this.props, this.state), () => this.scrollToActiveItem());

        window.addEventListener('scroll', this.handleScroll);
        window.addEventListener('resize', this.handleResize);
        if (this.contentRef && this.contentRef.current) {
            this.contentRef.current.addEventListener('scroll', this.handleContentScroll);
        }
    }

    componentDidUpdate(prevProps: TocProps) {
        if (prevProps.router.pathname !== this.props.router.pathname) {
            this.setTocHeight();
            this.setState(this.getState(this.props, this.state), () => this.scrollToActiveItem());
        }

        if (prevProps.lang !== this.props.lang) {
            i18n.changeLanguage(this.props.lang);
        }
    }

    componentWillUnmount() {
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        if (this.contentRef && this.contentRef.current) {
            this.contentRef.current.removeEventListener('scroll', this.handleContentScroll);
        }
    }

    render() {
        const {items} = this.props;
        const {filterName, filteredItemIds, contentScrolled} = this.state;
        let content;

        if (filterName.length !== 0 && filteredItemIds.length === 0) {
            content = this.renderEmpty('');
        } else {
            content = items ? this.renderList(items) : this.renderEmpty('');
        }

        return (
            <div className={b()} ref={this.rootRef}>
                {this.renderTop()}
                <div className={b('content', {scrolled: contentScrolled})} ref={this.contentRef}>
                    {content}
                </div>
            </div>
        );
    }

    private renderList(items: TocItem[], isMain = true) {
        const {flatToc, filteredItemIds, filterName, activeId} = this.state;

        return (
            <ul className={b('list')}>
                {items.map(({id, name, href, items: subItems}, index) => {
                    const opened = flatToc[id] ? flatToc[id].opened : true;
                    let isOpenFilteredItem = false;
                    let active = false;
                    let visibleChildren = Boolean(subItems);
                    let icon = null;
                    let text;

                    if (filteredItemIds.length > 0) {
                        filteredItemIds.forEach((itemId) => {
                            if (flatToc[itemId].parents.includes(id)) {
                                isOpenFilteredItem = true;
                            }
                        });
                    }

                    if (subItems && subItems.length > 0) {
                        icon = <ToggleArrow className={b('list-item-icon')} open={opened} thin={true} size={20}/>;
                    }

                    if (filteredItemIds.includes(id)) {
                        const firstEntry = name.toLowerCase().indexOf(filterName.toLowerCase());
                        isOpenFilteredItem = true;

                        text = (
                            <React.Fragment>
                                {name.substring(0, firstEntry)}
                                <span className={b('list-item-text-match')}>
                                    {name.substring(firstEntry, firstEntry + filterName.length)}
                                </span>
                                {name.substring(firstEntry + filterName.length)}
                            </React.Fragment>
                        );
                    } else {
                        text = <span>{name}</span>;
                    }

                    let content = (
                        <div
                            className={b('list-item-text')}
                            onClick={subItems && subItems.length > 0 ? this.handleItemClick.bind(this, id) : undefined}
                        >
                            {icon}
                            {text}
                        </div>
                    );

                    if (filterName.length > 0 && !isOpenFilteredItem) {
                        return null;
                    }

                    if (href) {
                        content = (
                            <a href={href} className={b('list-item-link')} data-router-shallow>{content}</a>
                        );

                        active = id === activeId;
                    }

                    if (subItems && (active || opened)) {
                        visibleChildren = true;
                    }

                    return (
                        <li key={index} id={id} className={b('list-item', {main: isMain, active, opened})}>
                            {content}
                            {subItems && visibleChildren && this.renderList(subItems, false)}
                        </li>
                    );
                })}
            </ul>
        );
    }

    private renderEmpty(text: string) {
        return <div className={b('empty')}>{text}</div>;
    }

    private renderTop() {
        const {router, title, href} = this.props;
        let topHeader;

        if (href) {
            const active = isActiveItem(router, href);

            topHeader = (
                <a href={href} className={b('top-header', {active, link: true})} data-router-shallow>
                    <HTML>{title}</HTML>
                </a>
            );
        } else {
            topHeader = <div className={b('top-header')}><HTML>{title}</HTML></div>;
        }

        return (
            <div className={b('top')}>
                {topHeader}
                <div className={b('top-filter')}>
                    <TextInput
                        className={b('top-filter-input')}
                        text={this.state.filterName}
                        placeholder={i18n.t('label_toc-filter-placeholder')}
                        onChange={this.handleFilterNameChange}
                    />
                </div>
            </div>
        );
    }

    private getState(props: TocProps, state: TocState) {
        const flatToc: Record<string, FlatTocItem> = {};
        let activeId;

        function processItems(items: TocItem[], parentId?: string) {
            items.forEach(({id, href, name, items: subItems}) => {
                flatToc[id] = state.flatToc[id]
                    ? {...state.flatToc[id]}
                    : {name, href, parents: []};

                if (parentId) {
                    flatToc[id].parents = [parentId, ...flatToc[parentId].parents];
                }

                if (href && isActiveItem(props.router, href)) {
                    activeId = id;
                }

                if (subItems) {
                    if (typeof flatToc[id].opened === 'undefined') {
                        flatToc[id].opened = flatToc[id].parents.length === 0;
                    }

                    processItems(subItems, id);
                }
            });
        }

        processItems(props.items);

        if (activeId) {
            flatToc[activeId].parents.forEach((id) => {
                flatToc[id].opened = true;
            });
        }

        return {flatToc, activeId};
    }

    private setTocHeight() {
        const containerHeight = this.containerEl?.offsetHeight ?? 0;
        const scrollDiff = window.scrollY + window.innerHeight - HEADER_HEIGHT - containerHeight;
        const rootNode = this.rootRef.current;

        if (!rootNode) {
            return;
        }

        if (scrollDiff > 0) {
            rootNode.style.height = window.innerHeight - HEADER_HEIGHT - scrollDiff + 'px';
        } else if (containerHeight < window.innerHeight) {
            rootNode.style.height = containerHeight + 'px';
        } else {
            rootNode.style.height = window.innerHeight - HEADER_HEIGHT + 'px';
        }
    }

    private scrollToActiveItem() {
        const {activeId} = this.state;
        const activeElement = activeId && document.getElementById(activeId);

        if (!activeElement) {
            return;
        }

        const itemElement = activeElement.querySelector<HTMLDivElement>(`.${b('list-item-text')}`);

        const itemHeight = itemElement?.offsetHeight ?? 0;
        const itemOffset = activeElement.offsetTop;
        const scrollableParent = activeElement.offsetParent as HTMLDivElement | null;

        if (!scrollableParent) {
            return;
        }

        const scrollableHeight = scrollableParent.offsetHeight;
        const scrollableOffset = scrollableParent.scrollTop;

        const itemVisible = (
            itemOffset >= scrollableOffset &&
            itemOffset <= scrollableOffset + scrollableHeight - itemHeight
        );

        if (!itemVisible) {
            scrollableParent.scrollTop = itemOffset - Math.floor(scrollableHeight / 2) + itemHeight;
        }
    }

    private getVisibleItemIds = (filterName: string) => {
        const {flatToc} = this.state;
        let filteredItemIds: string[] = [];

        if (filterName) {
            const itemIds = Object.keys(flatToc);

            filteredItemIds = itemIds.filter((id) => (
                flatToc[id].name.toLowerCase().includes(filterName.toLowerCase())
            ));
        }

        return filteredItemIds;
    };

    private handleScroll = () => {
        this.setTocHeight();
    };

    private handleResize = () => {
        this.setTocHeight();
    };

    private handleItemClick = (id: string) => {
        this.setState((prevState) => ({
            flatToc: {
                ...prevState.flatToc,
                [id]: {
                    ...prevState.flatToc[id],
                    opened: !prevState.flatToc[id].opened,
                },
            },
        }));
    };

    private handleFilterNameChange = (value: string) => {
        const filteredItemIds = this.getVisibleItemIds(value);
        let filteredState;

        if (value.length > 0 && filteredItemIds.length !== 0) {
            filteredState = {
                filterName: value,
                filteredItemIds,
            };
        } else {
            filteredState = {
                filterName: value,
                filteredItemIds: [],
            };
        }

        this.setState(filteredState);
    };

    private handleContentScroll = () => {
        const contentNode = this.contentRef.current;
        const contentScrolled = contentNode ? contentNode.scrollTop > 0 : false;
        if (contentScrolled !== this.state.contentScrolled) {
            this.setState({contentScrolled});
        }
    };
}