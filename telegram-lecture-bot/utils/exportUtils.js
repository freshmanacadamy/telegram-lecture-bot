const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const { dbHelpers } = require('../database');

module.exports = {
  // Export registrations to Excel
  async exportRegistrationsToExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');
    
    // Add headers
    worksheet.columns = [
      { header: 'Registration ID', key: 'id', width: 15 },
      { header: 'Student Name', key: 'first_name', width: 20 },
      { header: 'Student ID', key: 'student_id', width: 15 },
      { header: 'Lecture Title', key: 'lecture_title', width: 30 },
      { header: 'Registration Date', key: 'registered_at', width: 20 }
    ];

    // Get data
    const registrations = await dbHelpers.getAllRegistrations();
    
    // Add rows
    registrations.forEach(reg => {
      worksheet.addRow({
        id: reg.id,
        first_name: reg.first_name,
        student_id: reg.student_id,
        lecture_title: reg.lecture_title,
        registered_at: new Date(reg.registered_at).toLocaleDateString()
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    
    return workbook;
  },

  // Export to CSV
  async exportToCSV(data, fields) {
    const parser = new Parser({ fields });
    return parser.parse(data);
  },

  // Generate registration CSV
  async generateRegistrationsCSV() {
    const registrations = await dbHelpers.getAllRegistrations();
    const fields = ['id', 'first_name', 'student_id', 'lecture_title', 'registered_at'];
    return this.exportToCSV(registrations, fields);
  }
};
