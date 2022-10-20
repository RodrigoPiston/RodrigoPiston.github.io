import { Component, OnInit ,ViewChild, ElementRef} from "@angular/core";
import {formatDate} from '@angular/common';
import {HttpClient,HttpHeaders, HttpParams } from '@angular/common/http';
import { Convert,FlightData,Flight, FlightDataSet } from "src/app/services/flight/flight-data";
import * as XLSX from 'xlsx';
import { ToastrService } from "ngx-toastr";
@Component({
  selector: "app-dashboard",
  templateUrl: "dashboard.component.html"
})
export class DashboardComponent implements OnInit {
  
  private _httpHeaders : any;
  public textInput : string;
  public flightDataSet : FlightDataSet;
  public rowCount : number;
  @ViewChild('TABLE') table: ElementRef;
  public loading : boolean;

  constructor(private _http : HttpClient,private _toastr: ToastrService){
    this._httpHeaders = new HttpHeaders()
     .set('Cache-Control', 'no-cache')
     .set('Accept', '*/*');
     this.rowCount = 20;
  } 
  ngOnInit() {
  }
  clickEvent() {
    const params = new HttpParams({
      fromObject: {
        pnr: this.textInput,
      }
    });
    this.loading = true;

    this._http.post('https://request-redirect.herokuapp.com/post_pnr',{pnr:this.textInput},{headers: this._httpHeaders})
    .subscribe(response => {
      this.flightDataSet = Convert.toFlightDataSet(JSON.stringify(response));
        if(!this.flightDataSet || this.flightDataSet.flightData.flights.length == 0){
          this._toastr.error('<span class="finfo-icons icon-bell-55" [data-notify]="icon"></span><b>PNR Converter</b> - Error al cargar la información, formato invalido.', '', {
            enableHtml: true,
            closeButton: true,
            toastClass: "alert alert-danger alert-with-icon",
            positionClass: 'toast-bottom-center',
            timeOut: 5000
          });
        }
        this.loading = false;
    });
  }

  replaceString(value:string){
    return value.split("/")[1].replace("_"," ");
  }

  changedText(){
    const lines = this.textInput.split(/\r\n|\r|\n/);
    if(lines.length < 10){
      this.rowCount = 10;
    }else if(lines.length > 20){
      this.rowCount = 20;
    }else{
      this.rowCount = lines.length;
    }
  }

  exportAsExcel()
  {
    if(this.flightDataSet && this.flightDataSet.flightData.flights.length > 0){
      const ws: XLSX.WorkSheet=XLSX.utils.table_to_sheet(this.table.nativeElement);//converts a DOM TABLE element to a worksheet
      const wb: XLSX.WorkBook = XLSX.utils.book_new();

      XLSX.utils.sheet_add_dom(ws, document.getElementById('table'), {origin: -1});
      XLSX.utils.book_append_sheet(wb, ws, 'Intinerario');
      let formattedDate = formatDate(new Date(), 'ddMMMYYYYHHmmss','en_US').toString();
      XLSX.writeFile(wb, 'Intinerario'+formattedDate+'.xlsx');
    }else{
      this._toastr.error('<span class="finfo-icons icon-bell-55" [data-notify]="icon"></span><b>PNR Converter</b> - Debe de convertir un intinerario antes de descargarlo en formato excel.', '', {
        enableHtml: true,
        closeButton: true,
        toastClass: "alert alert-danger alert-with-icon",
        positionClass: 'toast-bottom-center',
        timeOut: 10000
      });
    }
      
    }

}
