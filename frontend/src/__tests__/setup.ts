// jsdom has no object URLs; the OCR pages create them for page images.
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};
