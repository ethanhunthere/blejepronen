interface PageHeaderProps {
  title: string
  subtitle?: string
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="h-1 w-12 rounded-full bg-[#C8B882] mb-4" aria-hidden="true" />
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#101828]">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-[16px] text-gray-600">{subtitle}</p>}
    </div>
  )
}
