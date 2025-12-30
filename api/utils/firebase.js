const { storage, ref, deleteObject } = require("../config/firebase.config");

const deleteImageFromFirebase = async (imageURL) => {
  if (!imageURL) {
    throw new Error("URL ảnh không được rỗng.");
  }

  try {
    const decodedURL = decodeURIComponent(imageURL);

    const storagePath = decodedURL.split("/o/")[1].split("?")[0];
    const imageRef = ref(storage, storagePath);

    await deleteObject(imageRef);

    return true;
  } catch (error) {
    console.error("Lỗi khi xóa ảnh từ Firebase:", error);
    throw error;
  }
};

module.exports = {
  deleteImageFromFirebase,
};
