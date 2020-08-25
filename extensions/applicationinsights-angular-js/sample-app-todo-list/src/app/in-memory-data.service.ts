import { Injectable } from '@angular/core';
import { InMemoryDbService } from 'angular-in-memory-web-api';
import { Todo } from './todo';

@Injectable({
  providedIn: 'root',
})
export class InMemoryDataService implements InMemoryDbService {
  createDb() {
    const todos = [
      { id: 1, name: 'delectus aut autem' },
      { id: 2, name: 'quis ut nam facilis et officia qui' },
      { id: 3, name: 'fugiat veniam minus' },
      { id: 4, name: 'et porro tempora' },
      { id: 5, name: 'laboriosam mollitia et enim quasi' },
      { id: 6, name: 'qui ullam ratione quibusdam voluptatem quia omnis' },
      { id: 7, name: 'illo expedita consequatur quia in' },
      { id: 8, name: 'quo adipisci enim quam ut ab' },
      { id: 9, name: 'molestiae perspiciatis ipsa' },
      { id: 10, name: 'illo est ratione doloremque quia maiores aut' }
    ];
    return {todos};
  }

  // Overrides the genId method to ensure that a todo always has an id.
  // If the todos array is empty,
  // the method below returns the initial number (11).
  // if the todos array is not empty, the method below returns the highest
  // todo id + 1.
  genId(todos: Todo[]): number {
    return todos.length > 0 ? Math.max(...todos.map(todo => todo.id)) + 1 : 1;
  }
}