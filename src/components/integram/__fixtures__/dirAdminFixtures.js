export const dirAdminDirectoryHtml = `<!DOCTYPE html>
<html>
<body>
<div class="alert alert-info" role="alert">Файл layout.html загружен</div>
<form enctype="multipart/form-data" action="/my/dir_admin" method="POST" name="view_dir">
<input type="hidden" name="_xsrf" value="xsrf-token">
<input name="templates" type="hidden" value="1">
<input name="add_path" type="hidden" value="/emails">
<p>Директория на сервере: <b>templates</b>. &nbsp; Перейти к директории <a href="/my/dir_admin/?download=1">download</a>.</p>
<table class="table table-striped table-condensed table-bordered">
  <tr>
    <td><a href="javascript:sel_all()" title="Инвертировать выделение"><b><font size="3">*</font></b></a></td>
    <td colspan="4" >&nbsp;<a href="/my/dir_admin/?templates=1"> .. </a>/<a href="/my/dir_admin/?templates=1&add_path=/emails">emails</a></td>
  </tr>
  <tr>
    <td><input type="checkbox" id="cheks" name="del[]" value="partials"></td>
    <td colspan="2"><a href="/my/dir_admin/?templates=1&add_path=/emails/partials"><b>partials</b></a></td>
    <td align="right">&nbsp;</td>
    <td align="right">&nbsp;</td>
  </tr>
  <tr>
    <td><input type="checkbox" id="cheks" name="del[]" value="layout.html"></td>
    <td>&nbsp;<a href="/my/dir_admin/?templates=1&add_path=/emails&gf=layout.html">layout.html</a>&nbsp;</td>
    <td>&nbsp;<a href="/ace/editor.html?src=/my/dir_admin/&templates=1&add_path=/emails&gf=layout.html" target="_blank" title="Редактировать (в новом окне)"><span class="glyphicon glyphicon-edit"></span></a>&nbsp;</td>
    <td align="right"> &nbsp;1.5 KB</td>
    <td align="left"> &nbsp;10.05.2026 12:00:00</td>
  </tr>
  <tr>
    <td><input type="checkbox" id="cheks" name="del[]" value="styles.css"></td>
    <td>&nbsp;<a href="/my/dir_admin/?templates=1&add_path=/emails&gf=styles.css">styles.css</a>&nbsp;</td>
    <td>&nbsp;<a href="/ace/editor.html?src=/my/dir_admin/&templates=1&add_path=/emails&gf=styles.css" target="_blank" title="Редактировать (в новом окне)"><span class="glyphicon glyphicon-edit"></span></a>&nbsp;</td>
    <td align="right"> &nbsp;240 Bytes</td>
    <td align="left"> &nbsp;10.05.2026 12:05:00</td>
  </tr>
  <tr>
    <td colspan="5"><input class="btn btn-default" type="submit" name="delete" value="Удалить выбранные"></td>
  </tr>
</table>
<p>Файлов: 2, каталогов: 1</p>
</form>
<form action="/my/dir_admin/?templates=1" method="POST">
<input name="add_path" type="hidden" value="/emails">
<input type="hidden" name="_xsrf" value="xsrf-token">
<input name="dir_name" class="form-control" type="text" placeholder="Новый каталог">
<input class="btn btn-default" type="submit" name="mkdir" value="Создать">
</form>
<form action="/my/dir_admin/?templates=1" method="POST">
<input name="add_path" type="hidden" value="/emails">
<input type="hidden" name="_xsrf" value="xsrf-token">
<input name="dir_name" class="form-control" type="text" placeholder="Новый файл">
<input class="btn btn-default" type="submit" name="touch" value="Создать">
</form>
<form enctype="multipart/form-data" action="/my/dir_admin/?templates=1" method="POST">
<input name="add_path" type="hidden" value="/emails">
<input type="hidden" name="_xsrf" value="xsrf-token">
<input name="userfile" type="file">
<input type="checkbox" name="rewrite">
<input class="btn btn-default" type="submit" name="upload" value="Загрузить">
</form>
</body>
</html>`

export const dirAdminPermissionDeniedHtml = `<!DOCTYPE html>
<html>
<body>Недостаточно прав для доступа к этому рабочему месту<br><a href="/my">Назад</a></body>
</html>`
