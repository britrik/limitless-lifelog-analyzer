import React from 'react';
import { Card, CardContent, Typography, Tooltip, Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface MetricCardProps {
  title: string;
  value: number;
  growth: number | 'N/A';
  tooltip: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, growth, tooltip }) => {
  const growthColor = typeof growth === 'number' ? (growth > 0 ? 'success.main' : 'error.main') : 'text.secondary';
  const GrowthIcon = typeof growth === 'number' ? (growth > 0 ? ArrowUpwardIcon : ArrowDownwardIcon) : null;

  return (
    <Tooltip title={tooltip} arrow>
      <Card sx={{ height: '100%', cursor: 'pointer' }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {GrowthIcon && <GrowthIcon sx={{ color: growthColor, mr: 0.5, fontSize: 'small' }} />}
            <Typography variant="body2" sx={{ color: growthColor }}>
              {typeof growth === 'number' ? `${growth.toFixed(1)}%` : 'N/A'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Tooltip>
  );
};

export default MetricCard;
