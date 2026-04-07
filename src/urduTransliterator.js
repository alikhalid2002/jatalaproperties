export const urduPhoneticMap = {
  'a': 'ا', 'A': 'آ', 'b': 'ب', 'p': 'پ', 't': 'ت', 'T': 'ٹ', 's': 'س', 'S': 'ص', 
  'j': 'ج', 'ch': 'چ', 'H': 'ح', 'kh': 'خ', 'd': 'د', 'D': 'ڈ', 'z': 'ز', 'Z': 'ظ', 
  'r': 'ر', 'R': 'ڑ', 'sh': 'ش', 'f': 'ف', 'q': 'ق', 'k': 'ک', 'g': 'گ', 'l': 'ل', 
  'm': 'م', 'n': 'ن', 'w': 'و', 'v': 'و', 'h': 'ہ', 'y': 'ی', 'i': 'ی', 'e': 'ے', 
  'u': 'و', 'o': 'و', 'c': 'ک', 'x': 'کس', ' ': ' ', '-': '-'
};

// More robust transliteration string handling
export const transliterateToUrdu = (text) => {
  if (!text) return '';
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    let char = text[i];
    let nextChar = text[i + 1] ? text[i + 1].toLowerCase() : '';
    let doubleChar = char.toLowerCase() + nextChar;
    
    // Check double letter mappings first like 'ch', 'sh', 'kh'
    if (urduPhoneticMap[doubleChar]) {
      result += urduPhoneticMap[doubleChar];
      i += 2;
    } else {
      let mapped = urduPhoneticMap[char] || urduPhoneticMap[char.toLowerCase()];
      result += mapped !== undefined ? mapped : char;
      i++;
    }
  }
  return result;
};

export const handleUrduChange = (e, setter) => {
  const val = e.target.value;
  const isEnglish = /[a-zA-Z]/.test(val);
  setter(isEnglish ? transliterateToUrdu(val) : val);
};

export const urduToEnglishMap = {
  'ا': 'a', 'آ': 'aa', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 'T', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ڈ': 'D', 'ذ': 'z', 'ر': 'r', 'ڑ': 'R', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'u', 'ہ': 'h', 'ی': 'i', 'ے': 'e', ' ': ' ', '-': '-'
};

export const transliterateToEnglish = (urduText) => {
  if (!urduText) return '';
  // Basic heuristic: if it already has English, return it
  if (/[a-zA-Z]/.test(urduText)) return urduText;
  
  let result = '';
  for (let char of urduText) {
    result += urduToEnglishMap[char] || char;
  }
  return result;
};
