interface GroupedData {
  title: string;
  chats: any[];
}

export function groupChatsByDate(items?: any) {
  if (items === undefined || items.length === 0) return undefined;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 30);

  const groupedData: Record<string, any> = {
    today: [],
    yesterday: [],
    last_7_days: [],
    last_30_days: [],
    older: [],
  };

  items.forEach((item: any) => {
    // Get the created date from lastMessage, messages[0], or current date as fallback
    let createdAt: Date;
    if (item.lastMessage?.createdAt) {
      createdAt = new Date(item.lastMessage.createdAt);
    } else if (item.messages?.length > 0 && item.messages[0].createdAt) {
      createdAt = new Date(item.messages[0].createdAt);
    } else {
      createdAt = new Date(); // Fallback to current date
    }

    if (createdAt.toDateString() === today.toDateString()) {
      groupedData.today.push(item);
    } else if (createdAt.toDateString() === yesterday.toDateString()) {
      groupedData.yesterday.push(item);
    } else if (createdAt > last7Days) {
      groupedData.last_7_days.push(item);
    } else if (createdAt > last30Days) {
      groupedData.last_30_days.push(item);
    } else {
      groupedData.older.push(item);
    }
  });

  // Sort each group by the createdAt of the last message or first message
  for (const key in groupedData) {
    groupedData[key].sort((a: any, b: any) => {
      const aDate =
        a.lastMessage?.createdAt || a.messages?.[0]?.createdAt || new Date();
      const bDate =
        b.lastMessage?.createdAt || b.messages?.[0]?.createdAt || new Date();
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }

  const result: GroupedData[] = [
    { title: "Today", chats: groupedData.today },
    { title: "Yesterday", chats: groupedData.yesterday },
    { title: "Last 7 Days", chats: groupedData.last_7_days },
    { title: "Last 30 Days", chats: groupedData.last_30_days },
  ];

  // Group 'older' by month and sort
  const olderByMonth: Record<string, any[]> = {};
  groupedData.older.forEach((item: any) => {
    const createdAt = new Date(
      item.lastMessage?.createdAt || item.messages?.[0]?.createdAt || new Date()
    );
    const monthYearKey = createdAt.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    olderByMonth[monthYearKey] = olderByMonth[monthYearKey] || [];
    olderByMonth[monthYearKey].push(item);
  });

  // Sort months and add to results
  Object.keys(olderByMonth)
    .sort((a, b) => b.localeCompare(a))
    .forEach((key) => {
      result.push({ title: key, chats: olderByMonth[key] });
    });

  return result.filter((group) => group.chats.length > 0);
}
