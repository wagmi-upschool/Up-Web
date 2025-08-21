import toast from "react-hot-toast";

interface OptionData {
  value: string;
  optionId?: string;
  title?: string;
  extra?: any;
}

interface SaveOptionRequest {
  value: string;
  optionId?: string;
  assistantId?: string;
  conversationId?: string;
  itemIndex?: number;
}

const AssistantInputOption = {
  saveOption: async (data: SaveOptionRequest) => {
    try {
      const response = await fetch('/api/admin/assistant/input/addOption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        toast.error("Seçim kaydedilirken bir hata oluştu.");
        throw new Error('Network response was not ok');
      }
      
      const result = await response.json();
      toast.success("Seçim başarıyla kaydedildi.");
      return result;
    } catch (error) {
      console.error('Error saving option:', error);
      toast.error("Seçim kaydedilirken bir hata oluştu.");
      throw error;
    }
  },

  getOptions: async ({ search = "", page = 1 } = {}) => {
    try {
      const response = await fetch(`/api/admin/assistant/input/getOptions?search=${search}&page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching options:', error);
      throw error;
    }
  },

  getOptionAll: async ({ search = "", page = 1 } = {}) => {
    try {
      const response = await fetch(`/api/admin/assistant/input/getOptions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching all options:', error);
      throw error;
    }
  },

  removeOptions: async (id: string) => {
    try {
      const response = await fetch('/api/admin/assistant/input/removeOptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error removing option:', error);
      throw error;
    }
  },
};

export default AssistantInputOption;