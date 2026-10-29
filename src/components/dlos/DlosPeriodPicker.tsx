import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, ListFilter } from 'lucide-react';
import type { DlosPeriod } from '../../types/dlos';

const months = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2020, index, 1)));

interface Props {
  year?: number;
  periods: DlosPeriod[];
  currentYear: number;
  countsReady: boolean;
}

export const DlosPeriodPicker = ({ year, periods, currentYear, countsReady }: Props) => {
  const navigate = useNavigate();
  const [jumpYear, setJumpYear] = useState('');
  const listedYears = Array.from({ length: currentYear + 4 - 2000 }, (_, index) => 2000 + index);
  const years = [...new Set([...listedYears, ...periods.filter(period => period.year >= 1900 && period.year <= 2100).map(period => period.year)])].sort((a, b) => b - a);
  const recentYears = years.filter(value => value <= currentYear && value >= currentYear - 9);
  const futureYears = years.filter(value => value > currentYear);
  const earlierYears = years.filter(value => value < currentYear - 9);
  const countsByYear = new Map<number, number>();
  for (const period of periods) countsByYear.set(period.year, (countsByYear.get(period.year) || 0) + period.count);
  const countLabel = (count: number) => !countsReady ? '—' : `${count} ${count === 1 ? 'case' : 'cases'}`;
  const yearLink = (value: number) => <Link key={value} to={`/dlos/${value}`} className="dlos-period-link dlos-year-link">
    <span className="dlos-year-number">{value}</span>
    <span className="dlos-period-meta">{countLabel(countsByYear.get(value) || 0)}</span>
    {value === currentYear && <span className="dlos-current-tag">Current year</span>}
    <ArrowRight aria-hidden="true" className="dlos-period-arrow" size={17} />
  </Link>;

  if (year === undefined) return <section className="dlos-picker-surface" aria-labelledby="dlos-years-heading">
    <div className="dlos-picker-heading"><div><h2 id="dlos-years-heading">Registration year</h2><p>Choose the year the case was registered.</p></div><CalendarDays aria-hidden="true" size={19} /></div>
    <div className="dlos-picker-body">
      <h3 className="dlos-group-label">Recent years</h3>
      <div className="dlos-year-grid">{recentYears.map(yearLink)}</div>
      {futureYears.length > 0 && <div className="dlos-future-years"><h3 className="dlos-group-label">Future years</h3><div className="dlos-year-grid">{futureYears.map(yearLink)}</div></div>}
      {earlierYears.length > 0 && <details className="dlos-earlier-years">
        <summary>Earlier years <span>{earlierYears[earlierYears.length - 1]}–{earlierYears[0]}</span></summary>
        <div className="dlos-year-grid">{earlierYears.map(yearLink)}</div>
      </details>}
      <form className="dlos-jump-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const selected = Number(jumpYear);
        if (Number.isInteger(selected) && selected >= 1900 && selected <= 2100) navigate(`/dlos/${selected}`);
      }}>
        <label htmlFor="dlos-jump-year">Open another year</label>
        <div><input id="dlos-jump-year" type="number" min="1900" max="2100" required placeholder="1900–2100" value={jumpYear} onChange={event => setJumpYear(event.target.value)} /><button type="submit">Open year <ArrowRight size={15} aria-hidden="true" /></button></div>
      </form>
    </div>
  </section>;

  return <section className="dlos-picker-surface" aria-labelledby="dlos-months-heading">
    <div className="dlos-picker-heading"><div><h2 id="dlos-months-heading">{year} registration months</h2><p>Choose a month to browse registered cases.</p></div><CalendarDays aria-hidden="true" size={19} /></div>
    <div className="dlos-picker-body">
      <div className="dlos-month-toolbar">
        <span>Filter this year</span>
        <Link to={`/dlos/${year}/decisions`} className="dlos-decision-filter"><ListFilter aria-hidden="true" size={16} />Decisions<ArrowRight aria-hidden="true" size={15} /></Link>
        <span className="dlos-month-toolbar-hint">Browse personnel by penalty</span>
      </div>
      <div className="dlos-month-grid">{months.map((label, index) => {
      const count = periods.find(period => period.year === year && period.month === index + 1)?.count || 0;
      return <Link key={label} to={`/dlos/${year}/${index + 1}`} className="dlos-period-link dlos-month-link" data-has-cases={count > 0}>
        <span className="dlos-month-index">{String(index + 1).padStart(2, '0')}</span><span className="dlos-month-name">{label}</span>
        <span className="dlos-period-meta">{countLabel(count)}</span><ArrowRight aria-hidden="true" className="dlos-period-arrow" size={17} />
      </Link>;
    })}</div>
    </div>
  </section>;
};
