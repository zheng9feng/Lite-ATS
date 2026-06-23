import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

const overviewValues = [
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    total: Math.floor(Math.random() * 5000) + 1000,
  },
]

const monthKeys = [
  'dashboard.months.jan',
  'dashboard.months.feb',
  'dashboard.months.mar',
  'dashboard.months.apr',
  'dashboard.months.may',
  'dashboard.months.jun',
  'dashboard.months.jul',
  'dashboard.months.aug',
  'dashboard.months.sep',
  'dashboard.months.oct',
  'dashboard.months.nov',
  'dashboard.months.dec',
]

export function Overview() {
  const { t } = useTranslation()
  const data = useMemo(
    () =>
      overviewValues.map((value, index) => ({
        ...value,
        name: t(monthKeys[index]),
      })),
    [t]
  )

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          direction='ltr'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Bar
          dataKey='total'
          fill='currentColor'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
