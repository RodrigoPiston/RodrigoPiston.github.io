import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'textTransform'
})
export class TextTransformPipe implements PipeTransform {

  transform(value: string, ...args: unknown[]): unknown {
    const splitBy = '/'
    console.log(value)
    const splittedText = value.split( splitBy );
    return `${splittedText[1]}`;
  }

}
