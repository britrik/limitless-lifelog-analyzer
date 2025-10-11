import React from 'react';
import { List, ListItem, ListItemText, Typography } from '@mui/material';

void React;
import type { ActivityItem } from '../types';

export interface RecentActivityListProps {
  activities: ActivityItem[];
}

function RecentActivityList({ activities }: RecentActivityListProps) {
  if (!activities || activities.length === 0) {
    return <Typography>No recent activity</Typography>;
  }

  return (
    <List>
      {activities.map((item) => (
        <ListItem key={item.id}>
          <ListItemText primary={item.title} secondary={item.relativeTime} />
        </ListItem>
      ))}
    </List>
  );
}

RecentActivityList.displayName = 'RecentActivityList';

export default RecentActivityList;
