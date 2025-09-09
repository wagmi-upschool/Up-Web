import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import Image from "next/image";
import AssistantInputOption from "@/services/AssistantInputOption";

interface MessageRendererProps {
  content: string;
  sender: "user" | "ai";
}

interface WidgetData {
  widgetType: string;
  [key: string]: any;
}

// React Components for different widget types
const AssistantSelectionWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="flex w-full flex-col gap-4 rounded-bl-3xl rounded-br-3xl rounded-tr-3xl bg-white/60 p-4 outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-sm">
    <div className="flex flex-col gap-1">
      <div className="font-poppins text-sm font-semibold leading-tight text-stone-950">
        {data.title || "Merhaba!"}
        <br />
        {data.subtitle || "Roleplay alanına hoş geldin!"}
      </div>
      <div className="font-poppins text-sm font-medium leading-tight text-zinc-800">
        {data.description ||
          "Burası, iş hayatındaki çeşitli iletişim senaryolarını güvenli ve destekleyici bir ortamda pratik etmen için tasarlanmış bir alandır."}
      </div>
    </div>

    <div className="flex gap-4">
      {data.options?.slice(0, 2).map((option: any, index: number) => (
        <div
          key={index}
          className={`flex flex-1 cursor-pointer items-center gap-2 rounded-2xl p-4 transition-all ${
            option.selected
              ? "bg-white outline outline-2 outline-offset-[-2px] outline-blue-600"
              : "bg-white opacity-50 outline outline-1 outline-offset-[-1px] outline-neutral-200"
          }`}
        >
          <div className="flex flex-1 flex-col gap-1">
            <div className="font-poppins text-sm font-semibold leading-tight text-neutral-700">
              {option.title}
            </div>
            <div className="font-poppins text-xs font-medium leading-none text-neutral-700">
              {option.description}
            </div>
          </div>
          {option.selected && (
            <div className="relative h-5 w-5 overflow-hidden">
              <div className="absolute left-[1.25px] top-[3.71px] h-3 w-4 bg-blue-600" />
            </div>
          )}
        </div>
      ))}
    </div>

    <div className="flex gap-4">
      {data.options?.slice(2, 4).map((option: any, index: number) => (
        <div
          key={index + 2}
          className={`flex flex-1 cursor-pointer items-center gap-2 rounded-2xl p-4 transition-all ${
            option.selected
              ? "bg-white outline outline-2 outline-offset-[-2px] outline-blue-600"
              : "bg-white opacity-50 outline outline-1 outline-offset-[-1px] outline-neutral-200"
          }`}
        >
          <div className="flex flex-1 flex-col gap-1">
            <div className="font-poppins text-sm font-semibold leading-tight text-neutral-700">
              {option.title}
            </div>
            <div className="font-poppins text-xs font-medium leading-none text-neutral-700">
              {option.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TopicSelectionWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="inline-flex items-start justify-start gap-2 self-stretch pr-72">
    <div className="relative h-8 w-8">
      <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-blue-600" />
      <div className="absolute left-[6.97px] top-[8.52px] h-[3.10px] w-4">
        <div className="absolute left-0 top-0 h-[3.10px] w-1 bg-white" />
        <div className="absolute left-[12.40px] top-0 h-[3.10px] w-1 bg-white" />
      </div>
    </div>
    <div className="inline-flex flex-1 flex-col items-end justify-start gap-4 rounded-bl-3xl rounded-br-3xl rounded-tr-3xl bg-white/60 p-4 outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-sm">
      <div className="flex flex-col items-start justify-start gap-1 self-stretch">
        <div className="justify-start self-stretch font-poppins text-sm font-medium leading-tight text-zinc-800">
          {data.text ||
            "Bu konuda ihtiyacını daha iyi anlayabilmem için aşağıdaki metindeki boşlukları benim için doldurabilir misin?"}
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-2 self-stretch rounded-2xl bg-white p-4">
        <div className="inline-flex items-center justify-start gap-2 self-stretch">
          <div className="flex-1 justify-start font-poppins text-sm font-normal leading-tight text-zinc-800">
            İş yerinde yaşadığım zor durum
          </div>
        </div>

        <div className="flex h-8 flex-col items-start justify-start gap-1 self-stretch overflow-hidden rounded-lg bg-white outline outline-1 outline-offset-[-1px] outline-neutral-200">
          <div className="inline-flex flex-1 items-center justify-between self-stretch overflow-hidden rounded-[999px] bg-white px-4 py-2 shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-start gap-2">
              <div className="inline-flex flex-col items-start justify-start">
                <div className="inline-flex items-center justify-start gap-2">
                  <div className="justify-center text-center font-poppins text-sm font-medium leading-tight text-neutral-400">
                    Seç
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-4 w-4 overflow-hidden">
              <div className="absolute left-[2px] top-[5px] h-1.5 w-3 outline outline-[1.50px] outline-offset-[-0.75px] outline-neutral-600" />
            </div>
          </div>
        </div>

        <div className="inline-flex h-8 items-center justify-start gap-2 self-stretch">
          <div className="justify-start font-poppins text-sm font-normal leading-tight text-zinc-800">
            Bu durumda
          </div>
          <div className="inline-flex flex-1 flex-col items-start justify-start gap-1 self-stretch overflow-hidden rounded-lg bg-white outline outline-1 outline-offset-[-1px] outline-neutral-200">
            <div className="inline-flex flex-1 items-center justify-between self-stretch overflow-hidden rounded-[999px] bg-white px-4 py-2 shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-start gap-2">
                <div className="inline-flex flex-col items-start justify-start">
                  <div className="inline-flex items-center justify-start gap-2">
                    <div className="justify-center text-center font-poppins text-sm font-medium leading-tight text-neutral-400">
                      Seç
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative h-4 w-4 overflow-hidden">
                <div className="absolute left-[2px] top-[5px] h-1.5 w-3 outline outline-[1.50px] outline-offset-[-0.75px] outline-neutral-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center justify-start gap-2 self-stretch">
          <div className="flex-1 justify-start font-poppins text-sm font-normal leading-tight text-zinc-800">
            ile bir konuşma yapmam gerekli
          </div>
        </div>

        <div className="inline-flex h-5 items-center justify-start gap-2 self-stretch">
          <div className="flex-1 justify-start font-poppins text-sm font-normal leading-tight text-zinc-800">
            Bu konuşma sonunki hedefim
          </div>
        </div>

        <div className="flex h-8 flex-col items-start justify-start gap-1 self-stretch overflow-hidden rounded-lg bg-white outline outline-1 outline-offset-[-1px] outline-neutral-200">
          <div className="inline-flex flex-1 items-center justify-between self-stretch overflow-hidden rounded-[999px] bg-white px-4 py-2 shadow-[0px_2px_9px_0px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-start gap-2">
              <div className="inline-flex flex-col items-start justify-start">
                <div className="inline-flex items-center justify-start gap-2">
                  <div className="justify-center text-center font-poppins text-sm font-medium leading-tight text-neutral-400">
                    Seç
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-4 w-4 overflow-hidden">
              <div className="absolute left-[2px] top-[5px] h-1.5 w-3 outline outline-[1.50px] outline-offset-[-0.75px] outline-neutral-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-2 py-3 opacity-40 outline outline-1">
        <div className="justify-start font-poppins text-sm font-semibold leading-tight text-white">
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
    className="inline-flex w-full flex-col items-start justify-center gap-4 rounded-bl-3xl rounded-br-3xl rounded-tr-3xl bg-white/60 p-4 outline outline-1 outline-offset-[-1px] outline-white/30 backdrop-blur-sm"
  >
    <div
      data-property-1="desktop"
      className="flex flex-col items-start justify-start gap-1 self-stretch"
    >
      <div className="justify-start self-stretch font-poppins text-sm font-medium leading-tight text-zinc-800">
        {data.text ||
          "Lütfen aşağıdaki kategorilerden ilgini çeken iletişim konusunu seç."}
      </div>
    </div>

    {/* Render assistantGroups in rows of 2 */}
    {data.assistantGroups &&
      Array.from(
        { length: Math.ceil(data.assistantGroups.length / 2) },
        (_, rowIndex) => (
          <div
            key={rowIndex}
            className="inline-flex w-full items-center justify-start gap-4"
          >
            {data.assistantGroups
              .slice(rowIndex * 2, rowIndex * 2 + 2)
              .map((group: any, colIndex: number) => {
                const isSelected = data.selected === group.id;
                const isDisabled = data.selected && data.selected !== group.id;
                const isEmpty = !group.title; // For empty slots

                return (
                  <div
                    key={group.id || `${rowIndex}-${colIndex}`}
                    data-disable={isDisabled ? "yes" : "No"}
                    data-selected={isSelected ? "yes" : "no"}
                    data-type="Başlıklı"
                    className={`flex flex-1 cursor-pointer items-center justify-start gap-2 rounded-2xl bg-white p-4 transition-all ${
                      isEmpty
                        ? "border border-neutral-200 opacity-0"
                        : isSelected
                          ? "border-2 border-blue-600"
                          : isDisabled
                            ? "border border-neutral-200 opacity-50"
                            : "border border-neutral-200 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex-1 ${isSelected ? "flex items-center justify-start gap-2" : "inline-flex flex-col items-start justify-center gap-1"}`}
                    >
                      {isSelected ? (
                        <div className="inline-flex flex-1 flex-col items-start justify-center gap-1">
                          <div className="justify-start self-stretch font-poppins text-sm font-semibold leading-tight text-neutral-700">
                            {group.title}
                          </div>
                          <div className="justify-start self-stretch font-poppins text-xs font-medium leading-none text-neutral-700">
                            {group.description}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="justify-start self-stretch font-poppins text-sm font-semibold leading-tight text-neutral-700">
                            {group.title}
                          </div>
                          <div className="justify-start self-stretch font-poppins text-xs font-medium leading-none text-neutral-700">
                            {group.description}
                          </div>
                        </>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center">
                        <Image
                          src="/tick.svg"
                          alt="Selected"
                          width={20}
                          height={20}
                          className="h-5 w-5"
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
                  className="flex flex-1 items-center justify-start gap-2 rounded-2xl bg-white p-4 opacity-0 outline outline-1 outline-offset-[-1px] outline-neutral-200"
                >
                  <div className="inline-flex flex-1 flex-col items-start justify-center gap-1">
                    <div className="justify-start self-stretch font-poppins text-sm font-semibold leading-tight text-neutral-700">
                      Empty Slot
                    </div>
                    <div className="justify-start self-stretch font-poppins text-xs font-medium leading-none text-neutral-700">
                      Placeholder
                    </div>
                  </div>
                </div>
              )}
          </div>
        ),
      )}
  </div>
);

const InputMessageComponent: React.FC<{ data: any }> = ({ data }) => {
  const [selectedOptions, setSelectedOptions] = React.useState<{
    [key: string]: any;
  }>({});
  const [dropdownStates, setDropdownStates] = React.useState<{
    [key: string]: boolean;
  }>({});

  // Parse the message to extract blanks and create form fields
  const parseMessage = (message: string) => {
    if (!message) return { parts: [], blanks: [] };

    const parts = message.split("[BLANK]");
    const blanks = parts.length - 1;

    return { parts, blanks };
  };

  const { parts } = parseMessage(data.message || "");
  const settings = data.settings || [[]];
  const userOptions = data.userOptions || {};

  const handleOptionSelect = async (stageIndex: number, option: any) => {
    try {
      // Save the selection to backend
      await AssistantInputOption.saveOption({
        value: option.value,
        optionId: option.optionId,
        assistantId: data.assistantId,
        conversationId: data.conversationId,
        itemIndex: data.itemIndex,
      });

      // Update local state
      setSelectedOptions((prev) => ({
        ...prev,
        [stageIndex]: option,
      }));

      // Close dropdown
      setDropdownStates((prev) => ({
        ...prev,
        [stageIndex]: false,
      }));
    } catch (error) {
      console.error("Error saving option selection:", error);
    }
  };

  const toggleDropdown = (stageIndex: number) => {
    // Don't open dropdown if option is already selected
    if (selectedOptions[stageIndex] || userOptions[stageIndex]) {
      return;
    }

    setDropdownStates((prev) => ({
      ...prev,
      [stageIndex]: !prev[stageIndex],
    }));
  };

  return (
    <div className="border-white/31 flex w-full flex-col items-end gap-4 rounded-bl-3xl rounded-br-3xl rounded-tr-3xl border bg-white/55 p-4 backdrop-blur">
      <div className="flex flex-col gap-1 self-stretch">
        <div className="font-poppins text-sm font-medium leading-tight text-zinc-800">
          {data.introMessage ||
            "Bu konuda ihtiyacını daha iyi anlayabilmem için aşağıdaki metindeki boşlukları benim için doldurabilir misin?"}
        </div>
      </div>

      <div className="flex flex-col gap-2 self-stretch rounded-2xl bg-white p-4">
        {/* Render message with interactive blanks */}
        {parts.map((part, index) => (
          <div key={index} className="flex flex-col gap-2">
            {/* Text part */}
            {part && (
              <div className="font-poppins text-sm font-normal leading-tight text-zinc-800">
                {part.trim()}
              </div>
            )}

            {/* Dropdown for this blank (if exists) */}
            {index < settings.length &&
              settings[index] &&
              settings[index].length > 0 &&
              settings[index][0] &&
              !settings[index][0].writeOwn &&
              settings[index][0].value !== "" && (
                <div className="relative">
                  <div
                    onClick={() => toggleDropdown(index)}
                    className={`flex h-8 items-center justify-between overflow-hidden rounded-lg px-4 py-2 outline outline-1 outline-offset-[-1px] ${
                      selectedOptions[index] || userOptions[index]
                        ? "cursor-default bg-gray-50 outline-neutral-300"
                        : "cursor-pointer bg-white outline-neutral-200 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`font-poppins text-sm font-medium leading-tight ${
                        selectedOptions[index] || userOptions[index]
                          ? "text-zinc-800"
                          : "text-neutral-400"
                      }`}
                    >
                      {selectedOptions[index]?.value ||
                        userOptions[index]?.value ||
                        "Seç"}
                    </div>
                    <div
                      className={`relative h-4 w-4 overflow-hidden transition-transform ${
                        dropdownStates[index] ? "rotate-180" : ""
                      } ${
                        selectedOptions[index] || userOptions[index] ? "opacity-30" : "opacity-100"
                      }`}
                    >
                      <Image
                        src="/down_button.svg"
                        alt="Down Arrow"
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  {dropdownStates[index] && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
                      {settings[index].map(
                        (option: any, optionIndex: number) => (
                          <div
                            key={option.optionId || optionIndex}
                            onClick={() => handleOptionSelect(index, option)}
                            className="cursor-pointer border-b border-neutral-100 px-4 py-2 font-poppins text-sm font-medium leading-tight text-zinc-800 last:border-b-0 hover:bg-gray-50"
                          >
                            {option.value}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

const TitleTextBoxMessage: React.FC<{ data: any }> = ({ data }) => (
  <div className="rounded-lg border bg-gray-50 p-4">
    <h3 className="mb-3 text-sm font-semibold">{data.text}</h3>
    <div className="rounded-lg border bg-white p-3">
      <input
        type="text"
        className="w-full border-0 px-3 py-2 text-sm focus:outline-none"
        placeholder={data.hintText}
        defaultValue={data.inputText}
      />
    </div>
  </div>
);

const RecapOfferMessage: React.FC<{ data: any }> = ({ data }) => (
  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
    <p className="mb-3 text-sm font-medium">{data.text}</p>
    {data.showOptions && data.options && (
      <div className="space-y-2">
        {data.options.map((option: any, index: number) => (
          <button
            key={index}
            className="w-full rounded-lg border bg-white p-3 text-left transition-colors hover:border-green-300"
          >
            {option.label || option.text}
          </button>
        ))}
      </div>
    )}
  </div>
);

const AccountabilityCalendar: React.FC<{ data: any }> = ({ data }) => (
  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
    <h3 className="mb-3 text-sm font-semibold">{data.title}</h3>
    <p className="mb-3 text-xs text-gray-600">{data.mockMessage}</p>
    <div className="rounded-lg border bg-white p-3">
      <div className="grid grid-cols-7 gap-1 text-xs">
        {/* Simple calendar representation */}
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded bg-gray-100"
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NewAssistantAnnouncement: React.FC<{ data: any }> = ({ data }) => (
  <div className="rounded-lg border bg-gradient-to-r from-indigo-100 to-pink-100 p-4">
    <h3 className="mb-2 text-sm font-semibold">{data.title}</h3>
    {data.description && (
      <p className="mb-3 text-xs text-gray-600">{data.description}</p>
    )}
    {data.imageUrl && (
      <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gray-200">
        <Image
          src={data.imageUrl}
          alt={data.title}
          width={300}
          height={128}
          className="max-h-full max-w-full rounded-lg object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    )}
    <div className="text-xs text-gray-500">
      Assistant: {data.assistant?.name || "Unknown"}
    </div>
  </div>
);

const Ayrac: React.FC<{ data: any }> = ({ data }) => (
  <div className="flex w-full justify-center py-2">
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
  <div className="flex w-full justify-center py-4">
    <div className="text-center">
      <div className="font-poppins text-sm font-medium text-text-body-black">
        {data.date || "Tarih belirtilmemiş"}
      </div>
    </div>
  </div>
);

const HabitCardsWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
    <h3 className="mb-3 text-sm font-semibold">Alışkanlık Kartları</h3>
    <div className="text-xs text-gray-600">
      {data.assistantCount || 0} asistan,{" "}
      {Object.keys(data.assistantGroups || {}).length} grup
    </div>
    <div className="mt-3 space-y-2">
      {data.assistants?.slice(0, 3).map((assistant: any, index: number) => (
        <div key={index} className="rounded border bg-white p-2 text-xs">
          {assistant.name || `Asistan ${index + 1}`}
        </div>
      ))}
    </div>
  </div>
);

const HomeNavigationButton: React.FC<{ data: any }> = ({ data }) => (
  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
    <button className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600">
      {data.buttonTitle || "Ana Sayfa"}
    </button>
  </div>
);

const UnknownWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="rounded-lg border border-gray-300 bg-gray-100 p-4">
    <div className="mb-2 text-xs text-gray-500">Bilinmeyen Widget</div>
    <pre className="overflow-hidden text-xs text-gray-600">
      {JSON.stringify(data, null, 2).substring(0, 200)}...
    </pre>
  </div>
);

// Main component renderer
const WidgetRenderer: React.FC<{ data: WidgetData }> = ({ data }) => {
  switch (data.widgetType) {
    case "AssistantSelectionWidget":
    case "AssistantSelection":
      return <AssistantSelectionWidget data={data} />;
    case "TopicSelectionWidget":
    case "TopicSelection":
      return <TopicSelectionWidget data={data} />;
    case "TopicSelectionMessage":
      return <TopicSelectionMessage data={data} />;
    case "InputMessageComponent":
      return <InputMessageComponent data={data} />;
    case "TitleTextBoxMessage":
      return <TitleTextBoxMessage data={data} />;
    case "RecapOfferMessage":
      return <RecapOfferMessage data={data} />;
    case "AccountabilityCalendar":
      return <AccountabilityCalendar data={data} />;
    case "NewAssistantAnnouncement":
      return <NewAssistantAnnouncement data={data} />;
    case "Ayrac":
      return <Ayrac data={data} />;
    case "JournalDate":
      return <JournalDate data={data} />;
    case "HabitCardsWidget":
      return <HabitCardsWidget data={data} />;
    case "HomeNavigationButton":
      return <HomeNavigationButton data={data} />;
    default:
      return <UnknownWidget data={data} />;
  }
};

// Typing indicator component
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1 py-2">
    <div className="flex space-x-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
    </div>
  </div>
);

// Main MessageRenderer component
const MessageRenderer: React.FC<
  MessageRendererProps & { messageType?: string }
> = ({ content, sender, messageType }) => {
  const isUser = sender === "user";

  // Show typing indicator for typing messages
  if (messageType === "typing") {
    return <TypingIndicator />;
  }

  // Debug logging to help identify content issues
  if (process.env.NODE_ENV === "development") {
    // console.log('MessageRenderer content:', content);
    // console.log('MessageRenderer sender:', sender);
    // console.log('MessageRenderer messageType:', messageType);
  }

  // Try to parse JSON to detect widget messages
  const parseMessageContent = (content: string) => {
    // Handle undefined, null, or empty content
    if (!content || typeof content !== "string") {
      console.warn("MessageRenderer: Invalid content received:", content);
      return { type: "text", data: "Mesaj içeriği yok" };
    }

    try {
      const parsed = JSON.parse(content);
      if (parsed.widgetType) {
        return { type: "widget", data: parsed };
      }
    } catch (e) {
      // Not JSON, treat as regular text
      if (process.env.NODE_ENV === "development") {
        // console.log(
        //   "MessageRenderer: Content is not JSON, treating as text:",
        //   content.substring(0, 100),
        // );
      }
    }
    return { type: "text", data: content };
  };

  const { type, data } = parseMessageContent(content);

  if (type === "widget") {
    try {
      return (
        <div className="w-full">
          <WidgetRenderer data={data as WidgetData} />
        </div>
      );
    } catch (error) {
      console.error("Error rendering widget:", error);
      return (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
          Widget render hatası:{" "}
          {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </div>
      );
    }
  }

  // Regular text message with Markdown support
  return (
    <div
      className={`prose prose-sm max-w-none font-poppins ${isUser ? "!text-white" : "text-text-body-black"}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components for better styling
          p: ({ children }) => (
            <p
              className={`${isUser ? "font-normal !text-white" : "font-medium text-text-body-black"} mb-2 font-poppins text-sm leading-tight last:mb-0`}
            >
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1
              className={`${isUser ? "!text-white" : "text-title-black"} mb-3 font-righteous text-lg font-bold`}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={`${isUser ? "!text-white" : "text-title-black"} mb-2 font-righteous text-base font-semibold`}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={`${isUser ? "!text-white" : "text-title-black"} mb-2 text-sm font-semibold`}
            >
              {children}
            </h3>
          ),
          strong: ({ children }) => (
            <strong
              className={`font-bold ${isUser ? "!text-white" : "text-title-black"}`}
            >
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em
              className={`italic ${isUser ? "!text-white" : "text-text-body-black"}`}
            >
              {children}
            </em>
          ),
          code: ({ inline, children }: any) =>
            inline ? (
              <code className="rounded border border-message-box-border bg-message-box-bg px-1 py-0.5 font-mono text-xs">
                {children}
              </code>
            ) : (
              <code className="block overflow-x-auto rounded-lg border border-message-box-border bg-message-box-bg p-3 font-mono text-xs">
                {children}
              </code>
            ),
          ul: ({ children }) => (
            <ul className="mb-2 space-y-1 text-sm">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-inside list-decimal space-y-1 text-sm text-text-body-black">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li
              className={`flex items-start gap-2 text-sm ${isUser ? "!text-white" : "text-text-body-black"}`}
            >
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
            <blockquote className="mb-2 border-l-4 border-primary pl-4 text-sm italic text-text-description-gray">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto">
              <table className="min-w-full rounded-lg border border-message-box-border">
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
