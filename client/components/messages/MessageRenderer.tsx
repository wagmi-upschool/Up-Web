import React from 'react';

interface MessageRendererProps {
  content: string;
  sender: 'user' | 'ai';
}

interface WidgetData {
  widgetType: string;
  [key: string]: any;
}

// React Components for different widget types
const TopicSelectionMessage: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4 border">
    <p className="text-sm font-medium mb-3">{data.text}</p>
    <div className="space-y-2">
      {data.assistantGroups?.map((group: any, index: number) => (
        <div
          key={index}
          className="bg-white rounded-lg p-3 border hover:border-blue-300 cursor-pointer transition-colors"
        >
          <h4 className="font-semibold text-sm">{group.title}</h4>
          {group.description && (
            <p className="text-xs text-gray-600 mt-1">{group.description}</p>
          )}
        </div>
      ))}
    </div>
  </div>
);

const InputMessageComponent: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
    <p className="text-sm font-medium mb-3">{data.introMessage}</p>
    <div className="space-y-3">
      {data.settings?.map((settingGroup: any[], groupIndex: number) => (
        <div key={groupIndex} className="space-y-2">
          {settingGroup.map((setting: any, index: number) => (
            <div key={index} className="bg-white rounded-lg p-3 border">
              <label className="block text-sm font-medium mb-2">
                {setting.title || setting.name}
              </label>
              {setting.type === 'text' && (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={setting.placeholder}
                  defaultValue={setting.value}
                />
              )}
              {setting.type === 'dropdown' && (
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  {setting.options?.map((option: any, optIndex: number) => (
                    <option key={optIndex} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const TitleTextBoxMessage: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-gray-50 rounded-lg p-4 border">
    <h3 className="font-semibold text-sm mb-3">{data.text}</h3>
    <div className="bg-white rounded-lg border p-3">
      <input
        type="text"
        className="w-full px-3 py-2 border-0 text-sm focus:outline-none"
        placeholder={data.hintText}
        defaultValue={data.inputText}
      />
    </div>
  </div>
);

const RecapOfferMessage: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
    <p className="text-sm font-medium mb-3">{data.text}</p>
    {data.showOptions && data.options && (
      <div className="space-y-2">
        {data.options.map((option: any, index: number) => (
          <button
            key={index}
            className="w-full text-left bg-white rounded-lg p-3 border hover:border-green-300 transition-colors"
          >
            {option.label || option.text}
          </button>
        ))}
      </div>
    )}
  </div>
);

const AccountabilityCalendar: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
    <h3 className="font-semibold text-sm mb-3">{data.title}</h3>
    <p className="text-xs text-gray-600 mb-3">{data.mockMessage}</p>
    <div className="bg-white rounded-lg p-3 border">
      <div className="grid grid-cols-7 gap-1 text-xs">
        {/* Simple calendar representation */}
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 rounded flex items-center justify-center"
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NewAssistantAnnouncement: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-gradient-to-r from-indigo-100 to-pink-100 rounded-lg p-4 border">
    <h3 className="font-semibold text-sm mb-2">{data.title}</h3>
    {data.description && (
      <p className="text-xs text-gray-600 mb-3">{data.description}</p>
    )}
    {data.imageUrl && (
      <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
        <img
          src={data.imageUrl}
          alt={data.title}
          className="max-w-full max-h-full rounded-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    )}
    <div className="text-xs text-gray-500">
      Assistant: {data.assistant?.name || 'Unknown'}
    </div>
  </div>
);

const Ayrac: React.FC<{ data: any }> = ({ data }) => (
  <div className="flex items-center justify-center py-4">
    <div className="flex-1 h-px bg-gray-300"></div>
    <div className="px-4 text-xs text-gray-500">
      {data.isOpen ? 'Açık' : 'Kapalı'}
    </div>
    <div className="flex-1 h-px bg-gray-300"></div>
  </div>
);

const JournalDate: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-center">
    <div className="text-sm font-medium text-yellow-800">
      📅 {new Date(data.date).toLocaleDateString('tr-TR')}
    </div>
  </div>
);

const HabitCardsWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
    <h3 className="font-semibold text-sm mb-3">Alışkanlık Kartları</h3>
    <div className="text-xs text-gray-600">
      {data.assistantCount || 0} asistan, {Object.keys(data.assistantGroups || {}).length} grup
    </div>
    <div className="mt-3 space-y-2">
      {data.assistants?.slice(0, 3).map((assistant: any, index: number) => (
        <div key={index} className="bg-white rounded p-2 border text-xs">
          {assistant.name || `Asistan ${index + 1}`}
        </div>
      ))}
    </div>
  </div>
);

const HomeNavigationButton: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
    <button className="w-full bg-blue-500 text-white rounded-lg py-2 px-4 text-sm font-medium hover:bg-blue-600 transition-colors">
      {data.buttonTitle || 'Ana Sayfa'}
    </button>
  </div>
);

const UnknownWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
    <div className="text-xs text-gray-500 mb-2">Bilinmeyen Widget</div>
    <pre className="text-xs text-gray-600 overflow-hidden">
      {JSON.stringify(data, null, 2).substring(0, 200)}...
    </pre>
  </div>
);

// Main component renderer
const WidgetRenderer: React.FC<{ data: WidgetData }> = ({ data }) => {
  switch (data.widgetType) {
    case 'TopicSelectionMessage':
      return <TopicSelectionMessage data={data} />;
    case 'InputMessageComponent':
      return <InputMessageComponent data={data} />;
    case 'TitleTextBoxMessage':
      return <TitleTextBoxMessage data={data} />;
    case 'RecapOfferMessage':
      return <RecapOfferMessage data={data} />;
    case 'AccountabilityCalendar':
      return <AccountabilityCalendar data={data} />;
    case 'NewAssistantAnnouncement':
      return <NewAssistantAnnouncement data={data} />;
    case 'Ayrac':
      return <Ayrac data={data} />;
    case 'JournalDate':
      return <JournalDate data={data} />;
    case 'HabitCardsWidget':
      return <HabitCardsWidget data={data} />;
    case 'HomeNavigationButton':
      return <HomeNavigationButton data={data} />;
    default:
      return <UnknownWidget data={data} />;
  }
};

// Main MessageRenderer component
const MessageRenderer: React.FC<MessageRendererProps> = ({ content, sender }) => {
  // Try to parse JSON to detect widget messages
  const parseMessageContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.widgetType) {
        return { type: 'widget', data: parsed };
      }
    } catch (e) {
      // Not JSON, treat as regular text
    }
    return { type: 'text', data: content };
  };

  const { type, data } = parseMessageContent(content);

  if (type === 'widget') {
    return (
      <div className="w-full">
        <WidgetRenderer data={data as WidgetData} />
      </div>
    );
  }

  // Regular text message
  return (
    <p className="font-poppins text-text-body-black text-sm font-medium leading-relaxed whitespace-pre-wrap">
      {data as string}
    </p>
  );
};

export default MessageRenderer;