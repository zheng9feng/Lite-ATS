import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

type AnalyticsChartProps = {
  uploadsByMonth: { count: number; month: string }[]
}

export function AnalyticsChart({ uploadsByMonth }: AnalyticsChartProps) {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={uploadsByMonth}>
        <XAxis
          dataKey='month'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Area
          type='monotone'
          dataKey='count'
          stroke='currentColor'
          className='text-primary'
          fill='currentColor'
          fillOpacity={0.15}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
