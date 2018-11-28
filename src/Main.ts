VSS.init(null);
VSS.ready(function() {
    let test = new Test(VSS.getWebContext().user.name);
    document.getElementById("name").innerText = test.testMethod();
});
