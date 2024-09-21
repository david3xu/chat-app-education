import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props, ref) => {
    return <textarea className="w-full p-2 rounded-md" ref={ref} {...props} />
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
