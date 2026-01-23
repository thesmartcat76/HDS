(function () {
    function getCodebox() {
        return document.getElementById("codebox");
    }
    window.runCode = function runCode() {
        const codebox = getCodebox();
        if (!codebox) {
            alert("Codebox element not found on the page.");
            console.error("Codebox element not found");
            return;
        }

        const userCode = codebox.value || "";
        if (userCode.trim() === "") {
            alert("No code to run. Please enter JavaScript into the code box.");
            return;
        }

        try {
            const fn = new Function(userCode);
            fn();
        } catch (err) {
            console.error("Error while running user code:", err);
            alert("Error running code: " + (err && err.message ? err.message : String(err)));
        }
    };

    window.clearCode = function clearCode() {
        const codebox = getCodebox();
        if (!codebox) {
            alert("Codebox element not found on the page.");
            return;
        }
        codebox.value = "";
        alert("Code box cleared!");
    };
})();