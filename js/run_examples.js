// turns asserts into writeln
function reformatExample(code) {
    return code.replace(/(<span class="d_keyword">assert<\/span>\((.*)==(.*)\);)+/g, function(match, text, left, right) {
        return "writeln(" + left.trim() + "); "
            + "<span class='d_comment'>// " + right.trim() + "</span>";
    });
}

// wraps a unittest into a runnable script
function wrapIntoMain(code) {
    var currentPackage = $('body')[0].id;
    var codeOut = "";

    // dynamically wrap into main if needed
    if (code.indexOf("void main") >= 0) {
        codeOut = "import " + currentPackage + "; ";
        codeOut += code;
    }
    else {
        var codeOut = "void main(){ ";
        codeOut += "import " + currentPackage + "; ";
        // writing to the stdout is probably often used
        codeOut += "import std.stdio: write, writeln, writef, writefln; ";
        codeOut += code;
        codeOut += "\n}";
    }
    return codeOut;
}

$(document).ready(function()
{
    if ($('body')[0].id == "Home")
        return;

    // only for std at the moment
    if(!$('body').hasClass("std"))
        return;

    $('pre[class~=d_code]').each(function(index)
    {
        var currentExample = $(this);
        var orig = currentExample.html();

        orig = reformatExample(orig);

        // check whether it is from a ddoced unittest
        // manual created tests most likely can't be run without modifications
        if (!$(this).parent().parent().prev().hasClass("dlang_runnable"))
            return;

        currentExample.replaceWith(
                '<div>'
                    + '<div class="d_example_buttons">'
                        + '<input type="button" class="editButton" value="Edit">'
                        + '<input type="button" class="runButton" value="Run">'
                        + '<input type="button" class="resetButton" value="Reset">'
                    + '</div>'
                    + '<div class="d_code">'
                        + '<pre class="d_code">'+orig+'</pre>'
                    + '</div>'
                    + '<div class="d_run_code">'
                        + '<textarea class="d_code" style="display: none;"></textarea>'
                        + '<div class="d_code_output"><span class="d_code_title">Application output</span><br><textarea class="d_code_output" readonly>Running...</textarea>'
                    + '</div>'
                + '</div>'
        );
    });

    $('textarea[class=d_code]').each(function(index) {
        var thisObj = $(this);

        var parent = thisObj.parent();
        parent.css("display", "block");
        var orgSrc = parent.parent().children("div.d_code").children("pre.d_code");

        var prepareForMain = function()
        {
            var src = $.browser.msie && $.browser.version < 9.0 ? orgSrc[0].innerText : orgSrc.text();
            var arr = src.split("\n");
            var str = "";
            for ( i = 0; i < arr.length; i++)
            {
                str += arr[i]+"\n";
            }
            if ($.browser.msie && $.browser.version < 9.0)
                str = str.substr(0, str.length - 1);
            else
                str = str.substr(0, str.length - 2);

            return str;
        };

        var editor = CodeMirror.fromTextArea(thisObj[0], {
            lineNumbers: true,
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: true,
            mode: "text/x-d",
            lineWrapping: true,
            theme: "eclipse",
            readOnly: false,
            matchBrackets: true
        });

        editor.setValue(prepareForMain());

        var height = function(diff) {
            var par = code != null ? code : parent.parent().children("div.d_code");
            return (parseInt(par.css('height')) - diff) + 'px';
        };
        var btnParent = parent.parent().children(".d_example_buttons");

        var runBtn = btnParent.children("input.runButton");
        var editBtn = btnParent.children("input.editButton");
        var resetBtn = btnParent.children("input.resetButton");

        var outputDiv = parent.children("div.d_code_output");

        var code = $(editor.getWrapperElement());
        code.css('display', 'none');

        var output = outputDiv.children("textarea.d_code_output");
        var outputTitle = outputDiv.children("span.d_code_title");

        var hideAllWindows = function()
        {
            outputDiv.css('display', 'none');
            parent.parent().children("div.d_code").css('display', 'none');
            code.css('display', 'none');
        };

        editBtn.click(function(){
            resetBtn.css('display', 'inline-block');
            hideAllWindows();
            code.css('display', 'block');
            editor.refresh();
            editor.focus();
        });
        resetBtn.click(function(){
            resetBtn.css('display', 'none');
            editor.setValue(prepareForMain());
            hideAllWindows();
            parent.parent().children("div.d_code").css('display', 'block');
        });
        runBtn.click(function(){
            resetBtn.css('display', 'inline-block');
            $(this).attr("disabled", true);
            hideAllWindows();
            output.css('height', height(31));
            outputDiv.css('display', 'block');
            outputTitle.text("Application output");
            output.html("Running...");
            output.focus();
            var codeOut = wrapIntoMain(editor.getValue());
            $.ajax({
                type: 'POST',
                url: "http://dpaste.dzfl.pl/request/",
                dataType: "json",
                data:
                {
                    'code' : codeOut
                },
                success: function(data)
                {
                    data.defaultOutput = "All asserts passed";
                    parseOutput(data, output, outputTitle);
                    runBtn.attr("disabled", false);
                },
                error: function(jqXHR, textStatus, errorThrown )
                {
                    output.html("Temporarily unavailable");
                    if (typeof console != "undefined")
                    {
                        console.log(textStatus + ": " + errorThrown);
                    }

                    runBtn.attr("disabled", false);
                }
            });
        });
    });
});
