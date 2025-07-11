import React from 'react';
import { List, ListItem, ListItemText, Typography } from '@mui/material';

interface RecentActivityItem {
  id: string;
  title: string;
  date: string;
  // Add more fields if needed, e.g., type: 'recording' | 'analysis'
}

interface RecentActivityListProps {
  items: RecentActivityItem[];
}

export const RecentActivityList: React.FC<RecentActivityListProps> = ({ items }) => {
  if (items.length === 0) {
    return <Typography>No recent activity</Typography>;
  }

  return (
    <List>
      {items.map((item) => (
        <ListItem key={item.id}>
          <ListItemText primary={item.title} secondary={item.date} />
        </ListItem>
      ))}
    </List>
  );
};
