import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/cn'

export function Accordion({ items, className }: {
  items: { value: string; title: string; content: React.ReactNode }[]; className?: string
}) {
  return (
    <AccordionPrimitive.Root type="multiple" className={cn('divide-y divide-line rounded-lg border border-line bg-surface', className)}>
      {items.map(item => (
        <AccordionPrimitive.Item key={item.value} value={item.value}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="focus-ring flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-content hover:bg-surface-2 [&[data-state=open]>svg]:rotate-180">
              {item.title}
              <ChevronDown className="h-4 w-4 text-content-subtle transition-transform duration-base" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=open]:animate-page-in">
            <div className="px-4 pb-4 text-content-muted">{item.content}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}
