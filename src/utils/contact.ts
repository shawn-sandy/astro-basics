  export function validateForm() { 
    const form = document.querySelector("form") as HTMLFormElement;
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      validateForm();
    });

  
      const fields = form.querySelectorAll("input, textarea") as NodeListOf<
        HTMLInputElement | HTMLTextAreaElement
      >;
      let isValid = true;

      fields.forEach((field) => {
        const value = field.value.trim();
        let fieldValid = true;
        let errorMessage = "";

        if (field.required && !value) {
          fieldValid = false;
          errorMessage = "This field is required";
        } else if (field.type === "email" && value && !isValidEmail(value)) {
          fieldValid = false;
          errorMessage = "Please enter a valid email address";
        } else if (field.id === "phone" && value && !isValidPhone(value)) {
          fieldValid = false;
          errorMessage = "Please enter a valid phone number";
        }

        setFieldValidity(field, fieldValid, errorMessage);
        if (!fieldValid) isValid = false;
      });

      if (isValid) {
        form.submit();
      }
    }

    function isValidEmail(email: string) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone: string) {
      return /^[\d\s-()]{7,}$/.test(phone);
    }

    function setFieldValidity(
      field: HTMLElement,
      isValid: boolean,
      errorMessage: string
    ) {
      const errorElement = field.nextElementSibling as HTMLElement;

      if (isValid) {
        field.classList.remove("invalid");
        errorElement?.classList.add("error-msg");
      } else {
        field.classList.add("invalid");
        errorElement?.classList.remove("error-msg");
      }
    }
  }