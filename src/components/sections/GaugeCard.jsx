import { memo } from 'react';
import PropTypes from 'prop-types';
import GaugeChart from 'react-gauge-chart';

const GaugeCard = memo(({ gauge }) => {
  return (
    <div className="bg-card p-6 rounded-lg shadow-lg border border-border/50">
      <h2 className="text-lg font-semibold text-center mb-4">
        {gauge.title}
      </h2>
      <GaugeChart
        id={gauge.id}
        nrOfLevels={5}
        colors={gauge.colors}
        arcWidth={0.3}
        percent={gauge.percent}
        textColor="hsl(var(--foreground))"
        formatTextValue={() => gauge.value}
        animate={false}
        needleColor="#464A4F"
        needleBaseColor="#464A4F"
        style={{ transition: 'all 0.5s ease-out' }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Chỉ re-render khi percent hoặc value thay đổi
  return (
    prevProps.gauge.percent === nextProps.gauge.percent &&
    prevProps.gauge.value === nextProps.gauge.value
  );
});

GaugeCard.displayName = 'GaugeCard';

GaugeCard.propTypes = {
  gauge: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    colors: PropTypes.arrayOf(PropTypes.string).isRequired,
    percent: PropTypes.number.isRequired,
    value: PropTypes.string.isRequired,
  }).isRequired,
};

export default GaugeCard;
