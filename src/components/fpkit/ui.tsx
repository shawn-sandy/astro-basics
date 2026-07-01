import React from 'react'

/**
 * Extracts the appropriate ref type for a given element type.
 *
 * This utility type ensures that refs are properly typed based on the element
 * being rendered. For example, a button element receives HTMLButtonElement ref.
 * Excludes legacy string refs (deprecated since React 16.3).
 *
 * @typeParam C - The HTML element type (e.g., 'button', 'div', 'a')
 * @example
 * ```typescript
 * type ButtonRef = PolymorphicRef<'button'>; // React.Ref<HTMLButtonElement>
 * type DivRef = PolymorphicRef<'div'>; // React.Ref<HTMLDivElement>
 * ```
 */
type PolymorphicRef<C extends React.ElementType> = React.Ref<React.ElementRef<C>>

/**
 * Defines the 'as' prop that determines which HTML element to render.
 *
 * This is the core prop that enables polymorphic behavior, allowing components
 * to render as any valid React element type while maintaining type safety.
 *
 * @typeParam C - The HTML element type to render
 * @example
 * ```typescript
 * <UI as="button">Click me</UI>
 * <UI as="a" href="/home">Link</UI>
 * ```
 */
type AsProp<C extends React.ElementType> = {
  as?: C
}

/**
 * Identifies props that should be omitted to prevent type conflicts.
 *
 * This type ensures that our custom props don't conflict with native element
 * props by calculating which keys need to be omitted from the native props.
 *
 * @typeParam C - The HTML element type
 * @typeParam P - The custom props to merge
 */
type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P)

/**
 * Merges custom props with native element props while preventing conflicts.
 *
 * This creates a union of our custom props and the native props for the chosen
 * element, omitting any conflicting keys to ensure type safety.
 *
 * @typeParam C - The HTML element type
 * @typeParam Props - The custom props to add
 */
type PolymorphicComponentProp<
  C extends React.ElementType,
  Props extends object = Record<string, never>,
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>

/**
 * Extends PolymorphicComponentProp to include properly-typed ref support.
 *
 * @typeParam C - The HTML element type
 * @typeParam Props - The custom props to add
 */
type PolymorphicComponentPropWithRef<
  C extends React.ElementType,
  Props extends object = Record<string, never>,
> = PolymorphicComponentProp<C, Props> & {
  ref?: PolymorphicRef<C> | React.ForwardedRef<React.ElementRef<C>>
}

/**
 * Props for the UI component, extending polymorphic props with style and class support.
 *
 * @typeParam C - The HTML element type to render
 * @property {boolean} [renderStyles] - Reserved for future use.
 * @property {React.CSSProperties} [styles] - Inline styles to apply (overrides defaultStyles)
 * @property {React.CSSProperties} [defaultStyles] - Base styles that can be overridden by styles prop
 * @property {string} [classes] - CSS class names to apply to the element (custom prop)
 * @property {string} [className] - CSS class names to apply to the element (React standard prop)
 * @property {string} [id] - HTML id attribute
 * @property {React.ReactNode} [children] - Child elements to render
 */
type UIProps<C extends React.ElementType> = PolymorphicComponentPropWithRef<
  C,
  {
    /** @deprecated Reserved for future use. Currently has no effect. */
    renderStyles?: boolean
    styles?: React.CSSProperties
    defaultStyles?: React.CSSProperties
    classes?: string
    className?: string
    id?: string
    children?: React.ReactNode
  }
>

/**
 * UI Component function signature.
 *
 * @typeParam C - The HTML element type to render (defaults to 'div')
 */
type UIComponent = (<C extends React.ElementType = 'div'>(
  props: UIProps<C>
) => React.ReactElement | null) & { displayName?: string }

/**
 * UI - A polymorphic React component that can render as any HTML element.
 *
 * The UI component is a foundational primitive used throughout fpkit to create
 * flexible, type-safe components. It implements the polymorphic component pattern,
 * allowing a single component to render as different HTML elements while maintaining
 * full TypeScript type safety for element-specific props.
 *
 * @typeParam C - The HTML element type to render (e.g., 'button', 'div', 'a')
 *
 * @param {C} [as='div'] - The HTML element type to render. Defaults to 'div'.
 * @param {React.CSSProperties} [styles] - Inline styles to apply. Overrides defaultStyles.
 * @param {string} [classes] - CSS class names to apply (custom prop). Takes precedence over className.
 * @param {string} [className] - CSS class names to apply (React standard). Used if classes is not provided.
 * @param {React.CSSProperties} [defaultStyles] - Base styles that can be overridden by styles prop.
 * @param {React.ReactNode} [children] - Child elements to render inside the component.
 * @param {PolymorphicRef<C>} [ref] - Forwarded ref with proper typing for the element type.
 *
 * @example
 * // Basic usage - renders as div
 * <UI>Hello World</UI>
 *
 * @example
 * // Polymorphic rendering - renders as button with type-safe props
 * <UI as="button" onClick={handleClick}>
 *   Click me
 * </UI>
 *
 * @example
 * // Ref forwarding for focus management
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * <UI as="button" ref={buttonRef}>Auto-focused Button</UI>
 */
// `as unknown as UIComponent` is required: React.forwardRef returns ForwardRefExoticComponent which is
// structurally incompatible with the polymorphic UIComponent call signature at the type level.
// This double-cast is the standard pattern for polymorphic forwardRef components (used by Radix UI and similar libraries).
// eslint-disable-next-line react/display-name -- displayName is set explicitly two lines below; ESLint can't see post-definition assignment
const UI: UIComponent = React.forwardRef(
  <C extends React.ElementType>(
    { as, styles, style, classes, className, children, defaultStyles, ...props }: UIProps<C>,
    ref?: PolymorphicRef<C>
  ) => {
    const Component = as ?? 'div'

    const styleObj: React.CSSProperties = { ...defaultStyles, ...styles, ...style }

    // Support both 'classes' (custom) and 'className' (React standard)
    // 'classes' takes precedence if both are provided
    const classNameValue = classes ?? className

    return (
      <Component {...props} ref={ref} style={styleObj} className={classNameValue}>
        {children}
      </Component>
    )
  }
) as unknown as UIComponent

export default UI
UI.displayName = 'UI'
