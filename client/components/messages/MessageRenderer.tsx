import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Image from 'next/image';

interface MessageRendererProps {
  content: string;
  sender: 'user' | 'ai';
}

interface WidgetData {
  widgetType: string;
  [key: string]: any;
}

// React Components for different widget types
const AssistantSelectionWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="w-full p-4 bg-white/60 rounded-tr-3xl rounded-bl-3xl rounded-br-3xl outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-sm flex flex-col gap-4">
    <div className="flex flex-col gap-1">
      <div className="text-stone-950 text-sm font-semibold font-poppins leading-tight">
        {data.title || 'Merhaba!'}<br />
        {data.subtitle || 'Roleplay alanına hoş geldin!'}
      </div>
      <div className="text-zinc-800 text-sm font-medium font-poppins leading-tight">
        {data.description || 'Burası, iş hayatındaki çeşitli iletişim senaryolarını güvenli ve destekleyici bir ortamda pratik etmen için tasarlanmış bir alandır.'}
      </div>
    </div>
    
    <div className="flex gap-4">
      {data.options?.slice(0, 2).map((option: any, index: number) => (
        <div
          key={index}
          className={`flex-1 p-4 rounded-2xl flex items-center gap-2 cursor-pointer transition-all ${
            option.selected
              ? 'bg-white outline outline-2 outline-offset-[-2px] outline-blue-600'
              : 'opacity-50 bg-white outline outline-1 outline-offset-[-1px] outline-neutral-200'
          }`}
        >
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-neutral-700 text-sm font-semibold font-poppins leading-tight">
              {option.title}
            </div>
            <div className="text-neutral-700 text-xs font-medium font-poppins leading-none">
              {option.description}
            </div>
          </div>
          {option.selected && (
            <div className="w-5 h-5 relative overflow-hidden">
              <div className="w-4 h-3 left-[1.25px] top-[3.71px] absolute bg-blue-600" />
            </div>
          )}
        </div>
      ))}
    </div>
    
    <div className="flex gap-4">
      {data.options?.slice(2, 4).map((option: any, index: number) => (
        <div
          key={index + 2}
          className={`flex-1 p-4 rounded-2xl flex items-center gap-2 cursor-pointer transition-all ${
            option.selected
              ? 'bg-white outline outline-2 outline-offset-[-2px] outline-blue-600'
              : 'opacity-50 bg-white outline outline-1 outline-offset-[-1px] outline-neutral-200'
          }`}
        >
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-neutral-700 text-sm font-semibold font-poppins leading-tight">
              {option.title}
            </div>
            <div className="text-neutral-700 text-xs font-medium font-poppins leading-none">
              {option.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TopicSelectionWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="self-stretch pr-72 inline-flex justify-start items-start gap-2">
    <div className="w-8 h-8 relative">
      <div className="w-8 h-8 left-0 top-0 absolute bg-blue-600 rounded-full" />
      <div className="w-4 h-[3.10px] left-[6.97px] top-[8.52px] absolute">
        <div className="w-1 h-[3.10px] left-0 top-0 absolute bg-white" />
        <div className="w-1 h-[3.10px] left-[12.40px] top-0 absolute bg-white" />
      </div>
    </div>
    <div className="flex-1 p-4 bg-white/60 rounded-tr-3xl rounded-bl-3xl rounded-br-3xl outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-sm inline-flex flex-col justify-start items-end gap-4">
      <div className="self-stretch flex flex-col justify-start items-start gap-1">
        <div className="self-stretch justify-start text-zinc-800 text-sm font-medium font-poppins leading-tight">
          {data.text || 'Bu konuda ihtiyacını daha iyi anlayabilmem için aşağıdaki metindeki boşlukları benim için doldurabilir misin?'}
        </div>
      </div>
      
      <div className="self-stretch p-4 bg-white rounded-2xl flex flex-col justify-start items-start gap-2">
        <div className="self-stretch inline-flex justify-start items-center gap-2">
          <div className="flex-1 justify-start text-zinc-800 text-sm font-normal font-poppins leading-tight">
            İş yerinde yaşadığım zor durum
          </div>
        </div>
        
        <div className="self-stretch h-8 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 flex flex-col justify-start items-start gap-1 overflow-hidden">
          <div className="self-stretch flex-1 px-4 py-2 bg-white rounded-[999px] shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)] inline-flex justify-between items-center overflow-hidden">
            <div className="flex justify-start items-center gap-2">
              <div className="inline-flex flex-col justify-start items-start">
                <div className="inline-flex justify-start items-center gap-2">
                  <div className="text-center justify-center text-neutral-400 text-sm font-medium font-poppins leading-tight">
                    Seç
                  </div>
                </div>
              </div>
            </div>
            <div className="w-4 h-4 relative overflow-hidden">
              <div className="w-3 h-1.5 left-[2px] top-[5px] absolute outline outline-[1.50px] outline-offset-[-0.75px] outline-neutral-600" />
            </div>
          </div>
        </div>
        
        <div className="self-stretch h-8 inline-flex justify-start items-center gap-2">
          <div className="justify-start text-zinc-800 text-sm font-normal font-poppins leading-tight">Bu durumda</div>
          <div className="flex-1 self-stretch bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 inline-flex flex-col justify-start items-start gap-1 overflow-hidden">
            <div className="self-stretch flex-1 px-4 py-2 bg-white rounded-[999px] shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)] inline-flex justify-between items-center overflow-hidden">
              <div className="flex justify-start items-center gap-2">
                <div className="inline-flex flex-col justify-start items-start">
                  <div className="inline-flex justify-start items-center gap-2">
                    <div className="text-center justify-center text-neutral-400 text-sm font-medium font-poppins leading-tight">
                      Seç
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-4 h-4 relative overflow-hidden">
                <div className="w-3 h-1.5 left-[2px] top-[5px] absolute outline outline-[1.50px] outline-offset-[-0.75px] outline-neutral-600" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="self-stretch inline-flex justify-start items-center gap-2">
          <div className="flex-1 justify-start text-zinc-800 text-sm font-normal font-poppins leading-tight">
            ile bir konuşma yapmam gerekli
          </div>
        </div>
        
        <div className="self-stretch h-5 inline-flex justify-start items-center gap-2">
          <div className="flex-1 justify-start text-zinc-800 text-sm font-normal font-poppins leading-tight">
            Bu konuşma sonunki hedefim
          </div>
        </div>
        
        <div className="self-stretch h-8 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 flex flex-col justify-start items-start gap-1 overflow-hidden">
          <div className="self-stretch flex-1 px-4 py-2 bg-white rounded-[999px] shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)] inline-flex justify-between items-center overflow-hidden">
            <div className="flex justify-start items-center gap-2">
              <div className="inline-flex flex-col justify-start items-start">
                <div className="inline-flex justify-start items-center gap-2">
                  <div className="text-center justify-center text-neutral-400 text-sm font-medium font-poppins leading-tight">
                    Seç
                  </div>
                </div>
              </div>
            </div>
            <div className="w-4 h-4 relative overflow-hidden">
              <div className="w-3 h-1.5 left-[2px] top-[5px] absolute outline outline-[1.50px] outline-offset-[-0.75px] outline-neutral-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-10 px-2 py-3 opacity-40 bg-blue-600 rounded-2xl outline outline-1 inline-flex justify-center items-center gap-2">
        <div className="justify-start text-white text-sm font-semibold font-poppins leading-tight">
          Gönder
        </div>
      </div>
    </div>
  </div>
);

const TopicSelectionMessage: React.FC<{ data: any }> = ({ data }) => (
  <div 
    data-device="Desktop" 
    data-state="İletişim konusu" 
    className="w-full p-4 bg-white/60 rounded-tr-3xl rounded-bl-3xl rounded-br-3xl outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-sm inline-flex flex-col justify-center items-start gap-4"
  >
    <div data-property-1="desktop" className="self-stretch flex flex-col justify-start items-start gap-1">
      <div className="self-stretch justify-start text-zinc-800 text-sm font-medium font-poppins leading-tight">
        {data.text || 'Lütfen aşağıdaki kategorilerden ilgini çeken iletişim konusunu seç.'}
      </div>
    </div>
    
    {/* Render assistantGroups in rows of 2 */}
    {data.assistantGroups && Array.from({ length: Math.ceil(data.assistantGroups.length / 2) }, (_, rowIndex) => (
      <div key={rowIndex} className="w-full inline-flex justify-start items-center gap-4">
        {data.assistantGroups.slice(rowIndex * 2, rowIndex * 2 + 2).map((group: any, colIndex: number) => {
          const isSelected = data.selected === group.id;
          const isDisabled = data.selected && data.selected !== group.id;
          const isEmpty = !group.title; // For empty slots
          
          return (
            <div
              key={group.id || `${rowIndex}-${colIndex}`}
              data-disable={isDisabled ? "yes" : "No"}
              data-selected={isSelected ? "yes" : "no"}
              data-type="Başlıklı"
              className={`flex-1 p-4 bg-white rounded-2xl flex justify-start items-center gap-2 cursor-pointer transition-all ${
                isEmpty
                  ? 'opacity-0 border border-neutral-200'
                  : isSelected
                    ? 'border-2 border-blue-600'
                    : isDisabled
                      ? 'opacity-50 border border-neutral-200'
                      : 'border border-neutral-200 hover:shadow-sm'
              }`}
            >
              <div className={`flex-1 ${isSelected ? 'flex justify-start items-center gap-2' : 'inline-flex flex-col justify-center items-start gap-1'}`}>
                {isSelected ? (
                  <div className="flex-1 inline-flex flex-col justify-center items-start gap-1">
                    <div className="self-stretch justify-start text-neutral-700 text-sm font-semibold font-poppins leading-tight">
                      {group.title}
                    </div>
                    <div className="self-stretch justify-start text-neutral-700 text-xs font-medium font-poppins leading-none">
                      {group.description}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="self-stretch justify-start text-neutral-700 text-sm font-semibold font-poppins leading-tight">
                      {group.title}
                    </div>
                    <div className="self-stretch justify-start text-neutral-700 text-xs font-medium font-poppins leading-none">
                      {group.description}
                    </div>
                  </>
                )}
              </div>
              {isSelected && (
                <div className="w-5 h-5 flex items-center justify-center">
                  <Image 
                    src="/tick.svg" 
                    alt="Selected" 
                    width={20} 
                    height={20}
                    className="w-5 h-5"
                  />
                </div>
              )}
            </div>
          );
        })}
        
        {/* Fill empty slots if odd number of items in last row */}
        {rowIndex === Math.ceil(data.assistantGroups.length / 2) - 1 && 
         data.assistantGroups.length % 2 === 1 && (
          <div
            data-disable="No"
            data-selected="no"
            data-type="Başlıklı"
            className="flex-1 p-4 opacity-0 bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-neutral-200 flex justify-start items-center gap-2"
          >
            <div className="flex-1 inline-flex flex-col justify-center items-start gap-1">
              <div className="self-stretch justify-start text-neutral-700 text-sm font-semibold font-poppins leading-tight">Empty Slot</div>
              <div className="self-stretch justify-start text-neutral-700 text-xs font-medium font-poppins leading-none">Placeholder</div>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
);

const InputMessageComponent: React.FC<{ data: any }> = ({ data }) => (
  <div className="w-full p-4 bg-white/55 border border-white/31 backdrop-blur rounded-tr-3xl rounded-bl-3xl rounded-br-3xl flex flex-col items-end gap-4">
    <div className="self-stretch flex flex-col gap-1">
      <div className="text-zinc-800 text-sm font-medium font-poppins leading-tight">
        {data.introMessage || 'Bu konuda ihtiyacını daha iyi anlayabilmem için aşağıdaki metindeki boşlukları benim için doldurabilir misin?'}
      </div>
    </div>
    
    <div className="self-stretch p-4 bg-white rounded-2xl flex flex-col gap-2">
      <div className="inline-flex justify-start items-center gap-2">
        <div className="flex-1 text-zinc-800 text-sm font-normal font-poppins leading-tight">
          Şirketimize yeni bir ürün/hizmet/girişim fikri sunmak istiyorum. Sunumun ana fikri:
        </div>
      </div>
      
      <div className="h-8 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 flex justify-between items-center px-4 py-2 overflow-hidden">
        <div className="text-neutral-400 text-sm font-medium font-poppins leading-tight">
          Seç
        </div>
        <div className="w-4 h-4 relative overflow-hidden">
          <Image
            src="/down_button.svg"
            alt="Down Arrow"
            width={16}
            height={16}
            className="object-contain"
          />
        </div>
      </div>
      
      <div className="h-8 inline-flex justify-start items-center gap-2">
        <div className="text-zinc-800 text-sm font-normal font-poppins leading-tight">Hedef kitlesi:</div>
        <div className="flex-1 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 flex justify-between items-center px-4 py-2 overflow-hidden">
          <div className="text-neutral-400 text-sm font-medium font-poppins leading-tight">
            Seç
          </div>
          <div className="w-4 h-4 relative overflow-hidden">
            <Image
              src="/down_button.svg"
              alt="Down Arrow"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
        </div>
      </div>
      
      <div className="inline-flex justify-start items-center gap-2">
        <div className="flex-1 text-zinc-800 text-sm font-normal font-poppins leading-tight">
          ile bir konuşma yapmam gerekiyor. Sunumum sonunda
        </div>
      </div>
      
      <div className="h-8 inline-flex justify-start items-center gap-2">
        <div className="text-zinc-800 text-sm font-normal font-poppins leading-tight">dinleyicilere</div>
        <div className="flex-1 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-neutral-200 flex justify-between items-center px-4 py-2 overflow-hidden">
          <div className="text-neutral-400 text-sm font-medium font-poppins leading-tight">
            Seç
          </div>
          <div className="w-4 h-4 relative overflow-hidden">
            <Image
              src="/down_button.svg"
              alt="Down Arrow"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
        </div>
      </div>
      
      <div className="inline-flex justify-start items-center gap-2">
        <div className="flex-1 text-zinc-800 text-sm font-normal font-poppins leading-tight">
          gibi bir etki yaratmaya hedefliyorum.
        </div>
      </div>
    </div>
    
    <div className="h-10 px-2 py-3 opacity-40 bg-blue-600 rounded-2xl outline outline-1 inline-flex justify-center items-center gap-2">
      <div className="text-white text-sm font-semibold font-poppins leading-tight">
        Gönder
      </div>
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
        <Image
          src={data.imageUrl}
          alt={data.title}
          width={300}
          height={128}
          className="max-w-full max-h-full rounded-lg object-cover"
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
  <div className="w-full flex justify-center py-2">
    <Image
      src={data.isOpen ? "/journal/ayrac_open.svg" : "/journal/ayrac_close.svg"}
      alt={data.isOpen ? "Açık ayraç" : "Kapalı ayraç"}
      width={235}
      height={33}
      className="object-contain"
    />
  </div>
);

const JournalDate: React.FC<{ data: any }> = ({ data }) => (
  <div className="w-full flex justify-center py-4">
    <div className="text-center">
      <div className="text-text-body-black text-sm font-medium font-poppins">
        {data.date || 'Tarih belirtilmemiş'}
      </div>
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
    case 'AssistantSelectionWidget':
    case 'AssistantSelection':
      return <AssistantSelectionWidget data={data} />;
    case 'TopicSelectionWidget':
    case 'TopicSelection':
      return <TopicSelectionWidget data={data} />;
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

// Typing indicator component
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1 py-2">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    </div>
  </div>
);


// Main MessageRenderer component  
const MessageRenderer: React.FC<MessageRendererProps & { messageType?: string }> = ({ content, sender, messageType }) => {
  const isUser = sender === 'user';
  
  // Show typing indicator for typing messages
  if (messageType === 'typing') {
    return <TypingIndicator />;
  }

  // Debug logging to help identify content issues
  if (process.env.NODE_ENV === 'development') {
    console.log('MessageRenderer content:', content);
    console.log('MessageRenderer sender:', sender);
    console.log('MessageRenderer messageType:', messageType);
  }
  
  // Try to parse JSON to detect widget messages
  const parseMessageContent = (content: string) => {
    // Handle undefined, null, or empty content
    if (!content || typeof content !== 'string') {
      console.warn('MessageRenderer: Invalid content received:', content);
      return { type: 'text', data: 'Mesaj içeriği yok' };
    }

    try {
      const parsed = JSON.parse(content);
      if (parsed.widgetType) {
        return { type: 'widget', data: parsed };
      }
    } catch (e) {
      // Not JSON, treat as regular text
      if (process.env.NODE_ENV === 'development') {
        console.log('MessageRenderer: Content is not JSON, treating as text:', content.substring(0, 100));
      }
    }
    return { type: 'text', data: content };
  };

  const { type, data } = parseMessageContent(content);

  if (type === 'widget') {
    try {
      return (
        <div className="w-full">
          <WidgetRenderer data={data as WidgetData} />
        </div>
      );
    } catch (error) {
      console.error('Error rendering widget:', error);
      return (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          Widget render hatası: {error instanceof Error ? error.message : 'Bilinmeyen hata'}
        </div>
      );
    }
  }

  // Regular text message with Markdown support
  return (
    <div className={`prose prose-sm max-w-none font-poppins ${isUser ? '!text-white' : 'text-text-body-black'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components for better styling
          p: ({ children }) => (
            <p className={`${isUser ? '!text-white font-normal' : 'text-text-body-black font-medium'} text-sm font-poppins leading-tight mb-2 last:mb-0`}>
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className={`${isUser ? '!text-white' : 'text-title-black'} text-lg font-bold mb-3 font-righteous`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`${isUser ? '!text-white' : 'text-title-black'} text-base font-semibold mb-2 font-righteous`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`${isUser ? '!text-white' : 'text-title-black'} text-sm font-semibold mb-2`}>
              {children}
            </h3>
          ),
          strong: ({ children }) => (
            <strong className={`font-bold ${isUser ? '!text-white' : 'text-title-black'}`}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className={`italic ${isUser ? '!text-white' : 'text-text-body-black'}`}>
              {children}
            </em>
          ),
          code: ({ inline, children }: any) => (
            inline ? (
              <code className="bg-message-box-bg px-1 py-0.5 rounded text-xs font-mono border border-message-box-border">
                {children}
              </code>
            ) : (
              <code className="block bg-message-box-bg p-3 rounded-lg text-xs font-mono border border-message-box-border overflow-x-auto">
                {children}
              </code>
            )
          ),
          ul: ({ children }) => (
            <ul className="text-sm space-y-1 mb-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-text-body-black space-y-1 mb-2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className={`flex items-start gap-2 text-sm ${isUser ? '!text-white' : 'text-text-body-black'}`}>
              <Image
                src="/star.svg"
                alt="Star"
                width={16}
                height={16}
                className="mt-0.5 flex-shrink-0"
              />
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-text-description-gray text-sm mb-2">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full border border-message-box-border rounded-lg">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-message-box-border bg-icon-slate-white px-3 py-2 text-left text-xs font-semibold text-title-black">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-message-box-border px-3 py-2 text-sm text-text-body-black">
              {children}
            </td>
          ),
        }}
      >
        {data as string}
      </ReactMarkdown>
    </div>
  );
};

export default MessageRenderer;